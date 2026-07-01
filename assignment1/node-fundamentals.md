# Node.js Fundamentals

## What is Node.js?
Node.js is a runtime environment that allows you to run JavaScript outside the browser.

## How does Node.js differ from running JavaScript in the browser?
In the browser, JavaScript has access to the DOM, document, window, and browser APIs. In node you
have access to the file system, network, and its own built-in modules like fs, http, and path.
Node does not have access to the browser environment, so document, window, and DOM APIs do not
exist there. Ff you tried to run document.getElementById('btn') in a Node script, it would throw
an error.

## What is the V8 engine, and how does Node use it?
It's what actually compiles and runs the JavaScript code. V8 is google’s open source JavaScript
engine. Node.js took the V8 engine and made it available to run JavaScript outside the browser,
then wraps extra abilities around it. Node can run on your computer or on a server.

## What are some key use cases for Node.js?
Some key use cases for Node are building RESTful APIs, building web servers, using command 
line tools, and creating real-time applications.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.
The difference between CommonJS and ES Modules is that CommonJS uses require() which loads modules
synchronously at runtime, whereas ES Modules uses import which is static and get resolved before the
code runs. To use ES Modules you need to use .mjs files or set the “type”: "module" field in the package.

**CommonJS (default in Node.js):**
```js
// This is the default in Node and uses a require()
// to load modules.

const fs = require('fs');

function readGreeting() {
    return fs.readFileSync('greeting.txt', 'utf8');
}

module.exports = readGreeting;
```

**ES Modules (supported in modern Node.js):**
```js
// ES Modules is modern that uses import/export similar to React. 
import fs from 'fs';

export function readGreeting() {
  return fs.readFileSync('greeting.txt', 'utf8');
}
``` 