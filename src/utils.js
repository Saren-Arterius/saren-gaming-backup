import path from 'path';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const reverseString = (str) => {
  return (str === '') ? '' : reverseString(str.substr(1)) + str.charAt(0);
};
