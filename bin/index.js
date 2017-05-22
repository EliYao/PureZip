#!/usr/bin/env node
'use strict';
const Command = require('common-bin');
const fs = require('fs');
const Path = require('path');
const archiver = require("archiver");
const ignore = require("../ignore");

class PureZip extends Command {
    constructor(rawArgv) {
        super(rawArgv);
        this.usage = 'Usage: purezip';
        this.yargs.alias('V', 'version');
    }
    run() {
        const startTime = new Date().getTime();
        const argPath = getArgPath();
        getAllFileNames(argPath)
            .then(sortFilesType)
            .then(filterFiles => {
                //  console.log(filterFiles);
                addToZipFile(argPath, filterFiles, startTime);
            })
            .catch(err => {
                console.error(err);
            });
    }
}

// 判断文件类型
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

function sortFilesType(fileNames) {
    // console.log(fileNames);
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

// 过滤文件
function filterFileByName(files) {
    return files.filter(file => {
        const name = file;
        if (ignore.indexOf(name) !== -1 || name.indexOf(".") === 0 || name.endsWith(".zip")) {
            return false;
        }
        return true;
    });
}

function getAllFileNames(argPath) {
    return new Promise((resolve, reject) => {
        let fileNames = getFiles(argPath);
        resolve(fileNames);
    });
}

// 获取所有文件
function getFiles(dir, files_) {
    files_ = files_ || [];
    const dirfiles = fs.readdirSync(dir);
    if (dirfiles.length === 0) {
        files_.push(dir);
        return files_;
    }
    // console.log('before ignore', dirfiles);
    let filterfiles = filterFileByName(dirfiles);
    // console.log('after ignore', filterfiles);
    for (let i in filterfiles) {
        let name = Path.join(dir, filterfiles[i]);
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files_);
        } else {
            files_.push(name);
        }
    }
    return files_;
}

// 获取传参地址
function getArgPath() {
    let argPath = './';
    // if (process.argv.length >= 3) {
    //     argPath = process.argv[2];
    // }
    return argPath;
}

function addToZipFile(argPath, filterFiles, startTime) {
    let path = Path.resolve("./");
    const fileName = Path.parse(path).name + ".zip";
    console.info(`File name: ${fileName}`);
    let output = fs.createWriteStream(path + ".zip");
    let archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });
    filterFiles.forEach(file => {
        let path = Path.resolve(argPath, file.name);
        console.log(`Add: ${file.type}: ${path}`);
        let name = file.name;
        if (file.type === "file") {
            archive.file(name, { name: name });
        } else {
            archive.directory(name);
        }
    });
    archive.pipe(output);
    archive.finalize();
    output.on('close', () => {
        const endTime = new Date().getTime();
        const time = (endTime - startTime) / 1000;
        console.log(`File size: ${archive.pointer()} total bytes.`);
        console.log(`PureZip Finised, total use ${time} seconds.`);
    });
    archive.on('error', (err) => {
        throw err;
    });
}

let pureZip = new PureZip();
 pureZip.start();