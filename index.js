const fs = require("fs");
const fse = require('fs-extra');
const moment = require('moment');
const readline = require('readline');
const archiver = require('archiver');
const path = "/Users/Richard/Desktop/IEEE_Project/dummyData/" //VERY IMPORTANT! -- change path to change where binary files are read
const backupPath = "/Users/Richard/Desktop/IEEE_Project/" //IMPORTANT -- change to change where the backup ZIP file goes
const buf = fs.readFileSync('example.data') //buffer stream from the binary sample provided by Layne
var files = fs.readdirSync(path); //is an array of file names from the path directory
const sensorID = ["0 - Field LIDAR","1 - IMU","2 - GPS", "3 - Focus LIDAR", "4 - ZED Video", "5 - ZED Localization"]
//console.log(buf.readUInt32BE(1))
//turns 32 unsigned int unix time into MM/DD/YY
//console.log(moment.unix(buf.readUInt32BE(1)).format('MM/D/YY'))
// console.log(buf.readUInt32BE(1),"  thats the time?");


//used to allow user to input into cmd line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/*readline will prompt the user for a specific format input. Based on the input, a specific function
will be called
*/
rl.question(`Welcome to the File Parser! At the command prompt, the first argument should be either\
  'sort', 'filter', or 'backup'. When using filter, the second arguement should be a DATE, in 'MM/DD/YY format.\
  If sort is chosen, the second argument should be either 'type' to sort for sensor types or 'date'\
  Example inputs are : 'sort time', 'sort date', 'filter 05/01/19', 'filter 04/29/19', etc.`, (answer) => {
  var arguements = answer.split(" ");
  if (arguements[0] == 'backup'){
    backup();
  }
  else if (arguements.length != 2){
    console.log("invalid format! Open and try again.")
    rl.close();
  }
  //for the sort command functionality
  if (arguements[0] == 'sort'){
    if (arguements[1] == 'date'){
      sortDate(files);
      rl.close();
    }
    else if(arguements[1] == 'type'){
      sortSensor(files);
      rl.close();
    }
    else{
      console.log("invalid arguement! Please use 'sort date' or 'sort type'.");
      rl.close();
    }
  }
  else if(arguements[0] == 'filter'){
    if(!moment(arguements[1], 'MM/DD/YY',true).isValid()){
      console.log("invalid format! Please type in format MM/DD/YY! Ex. 03/02/99")
    }
    filterDate(arguements[1]);
  }
  rl.close();
});

//this function creates a backup of whereever path is pointing to the backupPath directory
//check archiver.js for more information of documentation
function backup(){
  var output = fs.createWriteStream(backupPath + '/dataBackUp.zip');
  var archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });
  output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
  });
  output.on('end', function() {
    console.log('Data has been drained');
  });
  archive.on('error', function(err) {
    throw err;
  });
  archive.pipe(output);
  archive.directory(path, 'backUpData');
  archive.finalize();
}

/*This function takes a MM/DD/YY format from the user, and filters the file directory for
files that have the same date. It also takes the filtered output, and filters again
based on hours.
*/
function filterDate(userInput){
const result = files.filter(file => {
    return moment.unix(fs.readFileSync(path+file).readUInt32BE(1)).format('MM/D/YY') == userInput
});
//result can also be returned here
console.log("filtered is: ", result)

console.log("filtered by time is:")
filterTime(result)
}

/*the sort date function takes a fileArray like fs.readdirSync(path) and
sorts it based on UNIX time. bfile - afile can be swapped to afile - bfile
for ascending/descending purposes
*/
function sortDate(fileArray){

  fileArray.sort(function(a, b) {
      var afile = fs.readFileSync(path+a).readUInt32BE(1)
      var bfile = fs.readFileSync(path+b).readUInt32BE(1)
        return bfile - afile
  });
  console.log(fileArray)
}

//filters the file array based on the hours in the day.
function filterTime(fileArray){
  console.log("input to filterTime is " + fileArray)
  var timeArr = [];
  var newTime = ""
  for (let i = 0; i < fileArray.length; i++){
    let fileHours = hourConverter(fs.readFileSync(path+fileArray[i]).readUInt32BE(1))
    if (i ==0){
      newTime = fileHours[0]
      timeArr.push("Hour "+newTime+" files are:")
      timeArr.push("  "+fileArray[i] + " TimeStamp: "+ fileHours[0]+":"+fileHours[1]+":"+fileHours[2])
    }
    else{
      if (newTime != fileHours[0]){
        newTime = fileHours[0]
        timeArr.push("Hour "+newTime+" files are:")
        timeArr.push("  "+fileArray[i] + " TimeStamp: "+ fileHours[0]+":"+fileHours[1]+":"+fileHours[2])
      }
      else{
        timeArr.push("  "+fileArray[i] + " TimeStamp: "+ fileHours[0]+":"+fileHours[1]+":"+fileHours[2])
      }
    }
  }
  for (let i = 0; i < timeArr.length; i++){
    console.log(timeArr[i]+"\n")
  }
}

//nearly same logic as filterTime, except it targets the first byte of the header file
function sortSensor(fileArray){
  console.log("input to filterSensor is " + fileArray)
  var sensorArr = [];
  var newSensor = ""
  for (let i = 0; i < fileArray.length; i++){
    let sensorType = fs.readFileSync(path+fileArray[i]).readUInt8(0)
    if (i ==0){
      newSensor = sensorID[sensorType]
      sensorArr.push(newSensor+" files are:")
      sensorArr.push("  "+fileArray[i])
    }
    else{
      if (newSensor != sensorID[sensorType]){
        newSensor = sensorID[sensorType]
        sensorArr.push(newSensor+" files are:")
        sensorArr.push("  "+fileArray[i])
      }
      else{
        sensorArr.push("  "+fileArray[i])
      }
    }
  }
  for (let i = 0; i < sensorArr.length; i++){
    console.log(sensorArr[i]+"\n")
  }
}

//used to create dummy data files for dates. The buffer can be manipulated like a
//array, so by looking at data[2] I was playing around with the third byte. Creating
//these files let me check if my time functions were working.
function createTimeFiles(){
  let data = buf
  console.log("initial data:", data)
  for (let i =1; i < 10; i++){
    console.log(data[2])
    data[2] = data[2]+1
    console.log(data[2]," new!")
    console.log(data)
    fse.outputFileSync(path+"oldest"+i.toString()+'.data', data, (err) => {
      if (err) console.log("here is the error! ", err)
      else{
      console.log("Successfully Written to File.")
      }
    });
  }
}
//same as createTimeFiles, but I looked at the first byte
function createSensorFiles(){
  let data = buf
  console.log("initial data:", data)
  for (let i =1; i < 6; i++){
    console.log(data[0])
    data[0] = data[0]+1
    console.log(data[0]," new!")
    console.log(data)
    fse.outputFileSync(path+"sensor"+i.toString()+'.data', data, (err) => {
      if (err) console.log("here is the error! ", err)
      else{
      console.log("Successfully Written to File.")
      }
    });
  }
}

//used to read all binary files within a directory while also displaying timestamp
function readFiles(){
    for(var j = 0; j < files.length; j++){
        console.log(fs.readFileSync(path+files[j]))
        console.log(files[j]+" is: "+ timeConverter(fs.readFileSync(path+files[j]).readUInt32BE(1)))
    }
}

//converted Unix time into readable form
function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes()
  var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

//converted unix time into hours 
function hourConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp * 1000);
  var hour = a.getHours();
  var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes()
  var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds();
  var time = [hour,min,sec]
  return time;
}
