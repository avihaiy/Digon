import { Client, Account } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6a6748ef003255232493')
    .setKey('standard_064228356a05481b9eb9f73424173ebfb2decbc264fdc20554db1e8e3cb216ecc9af8450103ee9ededa76f37f49378d1981156c227ea4c6a03ef3a2e91ca20ca0435668a4047939317295e18784961fe6751138f87fe9f752085566afdced8511b4c6f09a1b271c167c1faa5d31bf792abd4de4bc840b2fb087359dd8f52bdee');

const account = new Account(client);

async function testLogin() {
    try {
        console.log('Attempting to log in...');
        const session = await account.createEmailPasswordSession('avihaidj0@gmail.com', 'As0546526856');
        console.log('Login success!', session.$id);
    } catch (e) {
        console.error('Login failed:', e.message);
    }
}

testLogin();
