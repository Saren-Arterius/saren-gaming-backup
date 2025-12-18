import path from 'path';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const reverseString = (str) => {
  return str.split('').reverse().join('');
};
