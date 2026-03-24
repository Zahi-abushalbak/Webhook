"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const pipelines_1 = __importDefault(require("./routes/pipelines"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const jobs_1 = __importDefault(require("./routes/jobs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const port = process.env.PORT || 3000;
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use('/api/pipelines', pipelines_1.default);
app.use('/api/webhooks', webhooks_1.default);
app.use('/api/jobs', jobs_1.default);
app.listen(port, () => {
    console.log(`API Server listening on port ${port}`);
});
