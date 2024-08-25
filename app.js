const express = require("express");
const fileUpload = require("express-fileupload");
const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 4566;

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:4566",
  forcePathStyle: true,
});

const IMAGES_BUCKET = "my-local-bucket";
const UPLOAD_TEMP_PATH = "/tmp/uploads";

app.use(fileUpload());

// List all objects in a bucket
app.get("/IMAGES_BUCKET", async (req, res) => {
  const listObjectsParams = {
    Bucket: IMAGES_BUCKET,
  };

  try {
    const listObjectsResponse = await s3Client.send(
      new ListObjectsV2Command(listObjectsParams)
    );
    res.json(listObjectsResponse.Contents || []);
  } catch (error) {
    console.error("Error listing objects:", error);
    res.status(500).send("Error listing objects");
  }
});

// Retrieve an object from a bucket
app.get("/IMAGES_BUCKET/:fileName", async (req, res) => {
  const fileName = req.params.fileName;

  const getObjectParams = {
    Bucket: IMAGES_BUCKET,
    Key: fileName,
  };

  try {
    const data = await s3Client.send(new GetObjectCommand(getObjectParams));
    res.setHeader("Content-Type", data.ContentType);
    data.Body.pipe(res);
  } catch (error) {
    console.error("Error retrieving file:", error);
    res.status(500).send("Error retrieving file");
  }
});

// Upload an object to a bucket
app.post("/IMAGES_BUCKET", async (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(400).send("No file uploaded");
  }

  const file = req.files.image;
  const fileName = file.name;
  const tempPath = path.join(UPLOAD_TEMP_PATH, fileName);

  try {
    // Save file to temporary path
    await file.mv(tempPath);

    // Upload file to S3
    const uploadParams = {
      Bucket: IMAGES_BUCKET,
      Key: fileName,
      Body: fs.createReadStream(tempPath),
    };
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Clean up temporary file
    fs.unlinkSync(tempPath);

    res.send("File uploaded successfully");
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Error uploading file");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
