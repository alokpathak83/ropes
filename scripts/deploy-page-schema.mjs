import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const contentTypeUid = "page";
const applyChanges = process.argv.includes("--apply");
const allowedArguments = new Set(["--apply"]);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const schemaFile = path.join(
  projectDirectory,
  "contentstack",
  "content-types",
  `${contentTypeUid}.json`,
);

for (const argument of process.argv.slice(2)) {
  if (!allowedArguments.has(argument)) {
    throw new Error(`Unknown argument: ${argument}`);
  }
}

function requiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local before running this command.`,
    );
  }
  return value;
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function getSchemaDiff(localSchema, remoteSchema) {
  const remoteFields = new Map(
    remoteSchema.map((field) => [field.uid, field]),
  );
  const localFields = new Map(localSchema.map((field) => [field.uid, field]));
  const added = localSchema.filter((field) => !remoteFields.has(field.uid));
  const removed = remoteSchema.filter((field) => !localFields.has(field.uid));
  const updated = localSchema.filter((field) => {
    const remoteField = remoteFields.get(field.uid);
    return remoteField && canonicalJson(remoteField) !== canonicalJson(field);
  });

  return { added, removed, updated };
}

async function requestContentType(url, apiKey, managementToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      api_key: apiKey,
      authorization: managementToken,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(process.env.CONTENTSTACK_BRANCH
        ? { branch: process.env.CONTENTSTACK_BRANCH }
        : {}),
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let responseBody;
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseBody = {};
  }

  if (!response.ok) {
    const apiMessage =
      responseBody.error_message ||
      responseBody.message ||
      responseBody.error ||
      "The Contentstack API returned an unsuccessful response.";
    throw new Error(
      `Contentstack request failed (HTTP ${response.status}): ${apiMessage}`,
    );
  }

  return responseBody;
}

async function main() {
  const apiKey = requiredEnvironmentVariable("CONTENTSTACK_API_KEY");
  const managementToken = requiredEnvironmentVariable(
    "CONTENTSTACK_MANAGEMENT_TOKEN",
  );
  const baseUrl = (
    process.env.CONTENTSTACK_CMA_BASE_URL || "https://api.contentstack.io/v3"
  ).replace(/\/+$/, "");

  let localContentType;
  try {
    localContentType = JSON.parse(await readFile(schemaFile, "utf8"));
  } catch (error) {
    throw new Error(
      `Could not read valid JSON from ${path.relative(projectDirectory, schemaFile)}: ${error.message}`,
    );
  }

  if (localContentType.uid !== contentTypeUid) {
    throw new Error(
      `Expected UID "${contentTypeUid}" in ${path.relative(projectDirectory, schemaFile)}, found "${localContentType.uid}".`,
    );
  }

  const localSchema = localContentType.schema;
  if (!Array.isArray(localSchema)) {
    throw new Error("The local content type must contain a schema array.");
  }

  const localFieldUids = localSchema.map((field) => field?.uid);
  if (localFieldUids.some((uid) => typeof uid !== "string" || !uid)) {
    throw new Error("Every local schema field must have a non-empty UID.");
  }
  if (new Set(localFieldUids).size !== localFieldUids.length) {
    throw new Error("The local schema contains duplicate field UIDs.");
  }

  const contentTypeUrl = `${baseUrl}/content_types/${contentTypeUid}`;
  const getResponse = await requestContentType(
    contentTypeUrl,
    apiKey,
    managementToken,
  );
  const currentContentType = getResponse.content_type;
  if (!currentContentType || !Array.isArray(currentContentType.schema)) {
    throw new Error(
      "The Contentstack response did not contain a content_type schema.",
    );
  }

  const diff = getSchemaDiff(localSchema, currentContentType.schema);
  const branch = process.env.CONTENTSTACK_BRANCH || "main";

  console.log(
    `${applyChanges ? "Applying" : "Dry run"}: send the complete local "${contentTypeUid}" content type to branch "${branch}".`,
  );
  console.log(
    `The local schema is authoritative: ${currentContentType.schema.length} remote field(s) will be replaced by ${localSchema.length} local field(s).`,
  );
  console.log(
    `Schema differences: ${diff.added.length} added, ${diff.updated.length} updated, ${diff.removed.length} removed.`,
  );

  for (const field of diff.added) {
    console.log(`  + ${field.uid} (${field.data_type})`);
  }
  for (const field of diff.updated) {
    console.log(`  ~ ${field.uid} (${field.data_type})`);
  }
  for (const field of diff.removed) {
    console.log(`  - ${field.uid} (${field.data_type})`);
  }

  if (!applyChanges) {
    console.log(
      "No changes were sent. Run npm run contentstack:schema:apply to send the PUT, even if the schemas already match.",
    );
    return;
  }

  const contentTypeUpdate = {
    uid: localContentType.uid,
    title: localContentType.title,
    description: localContentType.description,
    schema: localContentType.schema,
    options: localContentType.options,
    maintain_revisions: localContentType.maintain_revisions,
  };

  await requestContentType(contentTypeUrl, apiKey, managementToken, {
    method: "PUT",
    body: JSON.stringify({ content_type: contentTypeUpdate }),
  });

  const verificationResponse = await requestContentType(
    contentTypeUrl,
    apiKey,
    managementToken,
  );
  const verifiedContentType = verificationResponse.content_type;
  const verifiedSchema = verifiedContentType?.schema;
  const expectedUids = localSchema.map((field) => field.uid);
  const verifiedUids = verifiedSchema?.map((field) => field.uid);

  if (
    !verifiedSchema ||
    canonicalJson(verifiedUids) !== canonicalJson(expectedUids)
  ) {
    throw new Error(
      "Contentstack accepted the update, but the remote schema field UIDs do not match the local schema.",
    );
  }

  console.log(
    `Verified: the remote "${contentTypeUid}" schema has the same field UIDs and order as the local schema.`,
  );
}

main().catch((error) => {
  console.error(`Schema deployment failed: ${error.message}`);
  process.exitCode = 1;
});