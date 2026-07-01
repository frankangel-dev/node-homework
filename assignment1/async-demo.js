const fs = require('fs');
const path = require('path');


// Write a sample file for demonstration
const filePath = path.join(__dirname, 'sample-files', 'sample.txt');
fs.writeFile(filePath,'Hello, async world!', (err) => {
    if (err) throw err;

    // 1. Callback style
    fs.readFile(filePath,'utf8', (err, data) => {
        if (err) throw err;
        console.log('Callback read:', data);
        
        // Callback hell example (test and leave it in comments):
        // Hard to read, maintain, and debug as nesting grows deeper
        
      //   fs.writeFile(filePath, 'Callback hell example 1', (err) => {
      //       if (err) throw err;
      //      
      //       fs.readFile(filePath,'utf8', (err, data) => {
      //           if (err) throw err;
      //           console.log('Callback read:', data);
      //
      //           fs.writeFile(filePath, 'Callback hell example 2', (err) => {
      //               if (err) throw err;
      //              
      //               fs.readFile(filePath,'utf8', (err, data) => {
      //                   if (err) throw err;
      //                   console.log('Callback read:', data);
      //               });
      //           });
      //       });
      //   });
    });
    
    // 2. Promise style
    new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    })
        .then(data => console.log('Promise read:', data))
        .catch(err => console.log(err));
    
    // 3. Async/Await style
    async function asyncRead() {
        try {
            const data = await fs.promises.readFile(filePath, 'utf8');
            console.log('Async/Await read:', data);
        } catch (err) {
            console.log(err);
        }
    }
    
    asyncRead();
});

