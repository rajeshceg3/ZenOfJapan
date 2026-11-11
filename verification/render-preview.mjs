import fs from 'node:fs';
import {renderPlace,places} from '../ambience.mjs';
const sr=22050;
for(let i=0;i<places.length;i++){
 const {left,right}=renderPlace(sr,i),length=left.length,bytes=length*4,b=Buffer.alloc(44+bytes);
 b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
 for(let j=0;j<length;j++){b.writeInt16LE(Math.round(left[j]*32767),44+j*4);b.writeInt16LE(Math.round(right[j]*32767),46+j*4);}
 fs.writeFileSync('/downloads/zen-ambience-'+i+'.wav',b);
}
