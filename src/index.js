import express from 'express';
import http from 'http';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

app.use(cors());

const PORT = process.env.PORT || 3000;
//console.log(process.env.PORT)
server.listen(PORT, () => console.log(`Server running in port ${PORT} 🚀 : http://0.0.0.0:3000/`));

