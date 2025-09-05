import express from "express";
import cors from "cors";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";

const app = express();
app.use(cors());
app.use(express.json());

// Cliente S3
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Cliente Textract
const textract = new TextractClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Endpoint presigned URL
app.get("/get-presigned-url", async (req, res) => {
  try {
    const { fileName, fileType } = req.query;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "facturas-s3",
      Key: fileName,
      ContentType: fileType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generando URL firmada" });
  }
});

// Endpoint para analizar factura
app.post("/extract-factura", async (req, res) => {
  try {
    const { fileName } = req.body;
    const bucket = process.env.S3_BUCKET_NAME || "facturas-s3";

    const command = new AnalyzeDocumentCommand({
      Document: { S3Object: { Bucket: bucket, Name: fileName } },
      FeatureTypes: ["TABLES", "FORMS"],
    });

    const data = await textract.send(command);

    const blocks = data.Blocks.filter((b) => b.BlockType === "LINE");
    const texto = blocks.map((b) => b.Text).join("\n");

    // Regex simples
    const numeroFactura = texto.match(/Factura\s*(No\.?|N°|#)[:\s]*([A-Za-z0-9\-]+)/i)?.[2] || null;
    const fecha = texto.match(/Fecha[:\s]*([\d\/\-]+)/i)?.[1] || null;
    const cliente = texto.match(/Cliente[:\s]*(.+)/i)?.[1] || null;
    const total = texto.match(/Total[:\s]*([\d\.,]+ ?[A-Z]{0,3})/i)?.[1] || null;

    res.json({
      numero_factura: numeroFactura,
      fecha,
      cliente,
      total,
      texto_completo: texto
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando la factura" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
