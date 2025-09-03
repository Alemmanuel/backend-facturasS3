import express from "express"
import cors from "cors"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const app = express()
app.use(cors())

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

// Endpoint para obtener presigned URL
app.get("/get-presigned-url", async (req, res) => {
  try {
    const { fileName, fileType } = req.query

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "facturas-s3", // Using env var for bucket name
      Key: fileName,
      ContentType: fileType,
    })

    const url = await getSignedUrl(s3, command, { expiresIn: 60 })

    res.json({ url })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error generando URL firmada" })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
