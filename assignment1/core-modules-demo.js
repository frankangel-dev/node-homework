const os = require('os');
const path = require('path');
const fs = require('fs');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log('Platform:', os.platform());
console.log('CPU:', os.cpus()[0].model);
console.log('Total Memory:', os.totalmem());

// Path module
const pathFile = path.join(__dirname, 'sample-files', 'demo.txt');
console.log('Joined path:', pathFile);

// fs.promises API
async function fsPromisesDemo() {
    try {
        await fs.promises.writeFile(pathFile, 'Hello from fs.promises!');
        const data = await fs.promises.readFile(pathFile, 'utf8');
        console.log('fs.promises read:', data);
    } catch (err) {
        console.log(err);
    }

    // Streams for large files- log first 40 chars of each chunk
    let content = '';
    for (let i = 1; i <= 100; i++) {
        content += `This is line ${i} in this large file.\n`;
    }

    const largeFilePath = path.join(__dirname, 'sample-files', 'largefile.txt');
    fs.writeFileSync(largeFilePath, content);

    const largeFileStream = fs.createReadStream(largeFilePath, {highWaterMark: 1024});
    largeFileStream.on('data', chunk => {
        console.log('Read chunk:', chunk.toString().replace(/\n/g, '').substring(0, 40));
    });
    largeFileStream.on('end', () => {
        console.log('Finished reading large file with streams.');
    });
}

fsPromisesDemo();