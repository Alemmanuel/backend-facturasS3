import express from "express";
import cors from "cors";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
app.use(cors());

const s3 = new S3Client({ region: "us-east-1" }); // ajusta a tu región

app.get("/get-presigned-url", async (req, res) => {
  try {
    const fileName = req.query.fileName; // nombre que viene del frontend
    const fileType = req.query.fileType; // tipo MIME

    // ⚠️ Aquí puedes validar que sea factura (ejemplo: PDF o PNG)
    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".png")) {
      return res.status(400).json({ error: "Solo se permiten facturas PDF o PNG" });
    }

    const command = new PutObjectCommand({
      Bucket: "facturas-s3",
      Key: fileName,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 }); // 1 min

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generando URL" });
  }
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
