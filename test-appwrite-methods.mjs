import { Client, Account } from 'appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6a6748ef003255232493');

const account = new Account(client);
console.log('Available methods on account:');
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(account)).filter(prop => prop.includes('Email')));
