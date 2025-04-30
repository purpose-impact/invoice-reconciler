# LlamaIndex Invoice Reconciler

This is a full-stack web app showing how to use LlamaCloud with the LlamaIndex.TS framework to produce a real-world application, in this case matching the terms of contracts against incoming invoices from the contracted companies, aka "invoice reconciliation".

## User flow

1. The user uploads one or more contracts to the app
2. These are indexed and made searchable by the app
3. The user uploads one or more invoices to the app
4. The app determines which contract each invoice applies to
5. It examines the terms of the contract and the invoice details and flags any discrepancies
6. It shows the user the results

## Under the hood

1. The user "logs in" by providing a LlamaCloud API key. This is used to create a LlamaCloud index. (The API key is stored in localStorage, as are other settings. This is not a good practice, but it kept the code simple for a demonstration)

2. Uploaded invoices are uploaded to the LlamaCloud index, which parses them and then stores the parsed chunks in a vector database. The LlamaCloud index also stores the parsed documents and original file names in the metadata, which we use to display them on the frontend.

3. When a user uploads an invoice, we parse it with LlamaParse. Then an LLM call extracts the name of the company that issued the invoice, and runs a retrieval query again the LlamaCloud index with that name.

4. The chunk with the highest match to the name is taken as the contract that the invoice applies to. We retrieve the entire parsed contract from the index.

5. A further LLM call compares the entire parsed contract against the full parsed invoice, and asks it to flag discrepancies. Because this is a complex task, we use OpenAI's o3-mini model for this.

6. The parsed invoices and any discrepancies are returned to the frontend.

## Running the app

The frontend is a vanilla Next.js application. It requires a `.env.local` file with a single variable, your `OPENAI_API_KEY`. Everything else is handled by LlamaCloud and credentials are stored on the client (insecurely!). You can run the app as normal:

```bash
npm install
npm run dev
```
