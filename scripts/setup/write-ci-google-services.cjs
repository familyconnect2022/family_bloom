'use strict';
// Synthetic native-build fixture: no real project, user, token or service credential.
// Refuse to run outside GitHub Actions or overwrite a local Google config.
const fs=require('node:fs'),path=require('node:path');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true')throw Error('CI_ONLY');
const root=path.resolve(__dirname,'../..'),target=path.join(root,'google-services.json');
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo;
if(app.android.package!=='com.familybloom.android')throw Error('INVALID_PACKAGE');
const data={project_info:{project_number:'100000000001',project_id:'family-bloom-ci-synthetic',storage_bucket:'family-bloom-ci-synthetic.invalid'},client:[{client_info:{mobilesdk_app_id:'1:100000000001:android:0000000000000000000000',android_client_info:{package_name:app.android.package}},oauth_client:[],api_key:[{current_key:'AIzaSySyntheticBuildOnly000000000000000'}],services:{appinvite_service:{other_platform_oauth_client:[]}}}],configuration_version:'1'};
fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('Synthetic CI Google services file generated, never used for live Firebase.');
