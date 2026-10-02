import { buildServer } from "./app.js";
const port=Number(process.env.PORT||10000);const server=buildServer();server.listen(port,"0.0.0.0",()=>console.info(`[chess] listening on 0.0.0.0:${port}`));
