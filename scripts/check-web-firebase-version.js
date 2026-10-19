const fs=require('fs'),path=require('path');
const file=path.join(process.cwd(),'node_modules','firebase','package.json');
if(!fs.existsSync(file)){process.exit(1)}
try{const v=JSON.parse(fs.readFileSync(file,'utf8')).version.split('.').map(Number);process.exit(v[0]>12||(v[0]===12&&v[1]>=19)?0:1)}catch{process.exit(1)}
