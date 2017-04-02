#!/usr/bin/env node
'use strict';
const fs = require('fs');
const Path = require('path');
const archiver = require("archiver");
const ignore = require("../ignore");

function init() {
    let argPath = getArgPath();
    getAllFileNames(argPath)
        .then(sortFilesType)
        .then(filesType => {
            let filterFiles = filterFileByName(filesType);
            addToZipFile(filterFiles);
        })
        .catch(err => {
            console.error(err);
        });
}

function getArgPath() {
    let argPath = './';
    // if (process.argv.length >= 3) {
    //     argPath = process.argv[2];
    // }
    return argPath;
}

function getAllFileNames(argPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(argPath, (err, fileNames) => {
            if (err) {
                console.error(err);
                return;
            }
            resolve(fileNames);
        });
    });
}

function sortFilesType(fileNames) {
    let promiseArr = [];
    for (let i = 0; i < fileNames.length; i++) {
        let check = checkFileType(fileNames[i]);
        promiseArr.push(check);
    }
    return new Promise((resolve, reject) => {
        Promise.all(promiseArr)
            .then((filesType) => {
                resolve(filesType);
            }).catch(err => {
                console.error(err);
            });
    });
}

function checkFileType(fileNames) {
    return new Promise((resolve, reject) => {
        fs.stat(Path.join(fileNames), (err, stats) => {
            if (err) return;
            if (stats.isFile() || stats.isDirectory()) {
                const type = stats.isFile() === true ? "file" : "folder";
                resolve({
                    name: fileNames,
                    type: type
                });
            }
        });
    });
}

function filterFileByName(filesType) {
    return filesType.filter(file => {
        const name = file.name;
        if (ignore.indexOf(name) !== -1 || name.indexOf(".") === 0 || name.endsWith(".zip")) {
            return false;
        }
        return true;
    });
}

function addToZipFile(filterFiles) {
    let path = Path.resolve("./");
    const fileName = Path.parse(path).name + ".zip";
    console.info("File name: ", fileName);
    let output = fs.createWriteStream(path + ".zip");
    let archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });
    filterFiles.forEach(file => {
        let path = Path.resolve("./", file.name);
        console.log(`Add: ${file.type}: ${path}`);
        let name = file.name;
        if (file.type === "file") {
            archive.file(name, { name: name});
        } else {
            archive.directory(name + "/");
        }
    });
    archive.pipe(output);
    output.on('close', function () {
        console.log("File size: " + archive.pointer() + ' total bytes.');
        console.log('PureZip Finised.');
    });
    archive.on('error', function (err) {
        throw err;
    });
    archive.finalize();
}

init();
