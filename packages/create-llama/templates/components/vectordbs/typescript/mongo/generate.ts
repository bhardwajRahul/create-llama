import { MongoDBAtlasVectorSearch } from "@llamaindex/mongodb";
import * as dotenv from "dotenv";
import { storageContextFromDefaults, VectorStoreIndex } from "llamaindex";
import { MongoClient } from "mongodb";
import { getDocuments } from "./loader";
import { initSettings } from "./settings";
import { checkRequiredEnvVars, POPULATED_METADATA_FIELDS } from "./shared";

dotenv.config();

const mongoUri = process.env.MONGODB_URI!;
const databaseName = process.env.MONGODB_DATABASE!;
const vectorCollectionName = process.env.MONGODB_VECTORS!;
const indexName = process.env.MONGODB_VECTOR_INDEX;

async function loadAndIndex() {
  // Create a new client and connect to the server
  const client = new MongoClient(mongoUri);

  // load objects from storage and convert them into LlamaIndex Document objects
  const documents = await getDocuments();

  // create Atlas as a vector store
  const vectorStore = new MongoDBAtlasVectorSearch({
    mongodbClient: client,
    dbName: databaseName,
    collectionName: vectorCollectionName, // this is where your embeddings will be stored
    indexName: indexName, // this is the name of the index you will need to create
    indexedMetadataFields: POPULATED_METADATA_FIELDS,
    embeddingDefinition: {
      dimensions: process.env.EMBEDDING_DIM
        ? parseInt(process.env.EMBEDDING_DIM)
        : 1536,
    },
  });

  // now create an index from all the Documents and store them in Atlas
  const storageContext = await storageContextFromDefaults({ vectorStore });
  await VectorStoreIndex.fromDocuments(documents, { storageContext });
  console.log(
    `Successfully created embeddings in the MongoDB collection ${vectorCollectionName}.`,
  );
  await client.close();
}

(async () => {
  try {
    checkRequiredEnvVars();
    initSettings();
    await loadAndIndex();
    console.log("Finished generating storage.");
  } catch (error) {
    console.error("Error generating storage.", error);
  }
})();
