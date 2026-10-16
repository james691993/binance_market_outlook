import {readFile,mkdir,writeFile} from 'node:fs/promises';
const assets={};for(const [name,type] of [['index.html','text/html; charset=utf-8'],['style.css','text/css'],['app.js','application/javascript'],['indicators.mjs','application/javascript']])assets['/'+name]={body:await readFile('public/'+name,'utf8'),type};
const handler=await readFile('worker/handler.mjs','utf8');
const output=handler+'\nconst assets='+JSON.stringify(assets)+';\nexport default {async fetch(request){const path=new URL(request.url).pathname;if(path===\'/api/telegram\')return telegram(request);const asset=assets[path===\'/\'?\'/index.html\':path];if(!asset)return new Response(\'Not found\',{status:404});return new Response(asset.body,{headers:{\'Content-Type\':asset.type,\'Cache-Control\':\'no-store\'}})}};';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await writeFile('worker/index.js',output);await writeFile('dist/server/index.js',output);await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Worker and embedded assets built');
