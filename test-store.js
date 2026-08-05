import { Client, Databases } from 'node-appwrite';
const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6a6748ef003255232493')
    .setKey('standard_064228356a05481b9eb9f73424173ebfb2decbc264fdc20554db1e8e3cb216ecc9af8450103ee9ededa76f37f49378d1981156c227ea4c6a03ef3a2e91ca20ca0435668a4047939317295e18784961fe6751138f87fe9f752085566afdced8511b4c6f09a1b271c167c1faa5d31bf792abd4de4bc840b2fb087359dd8f52bdee');
const databases = new Databases(client);
async function run() {
    const res = await databases.listDocuments('6a674a380025507f9db2', 'store_items');
    console.log(JSON.stringify(res.documents[0], null, 2));
}
run();
