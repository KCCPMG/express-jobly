const { BadRequestError } = require('../expressError');
const { sqlForPartialUpdate } = require('./sql.js');


describe("Get correct update strings using sqlForPartialUpdate", function(){

  test("should work", function(){

    const dataToUpdate = {
      firstName: 'Testio',
      lastName: 'McTest',
      favNo: 10
    }

    const jsToSQL = {
      firstName: 'first_name',
      lastName: 'last_name',
      zodiacSign: 'zodiac_sign',
      favNo: 'favorite_number',
      birthday: 'birthday'
    }

    const expectedResult = {
      setCols: '\"first_name\"=$1, \"last_name\"=$2, \"favorite_number\"=$3',
      values: ['Testio', 'McTest', 10]
    }

    const outputObj = sqlForPartialUpdate(dataToUpdate, jsToSQL);

    expect(outputObj).toEqual(expectedResult);
  })

  test("generate error", function(){

    const dataToUpdate = {
      // empty
    }

    const jsToSQL = {
      firstName: 'first_name',
      lastName: 'last_name',
      zodiacSign: 'zodiac_sign',
      favNo: 'favorite_number',
      birthday: 'birthday'
    }

    try {
      sqlForPartialUpdate(dataToUpdate, jsToSQL)
    } catch(err) {
      expect(err instanceof BadRequestError).toBe(true);
    }

  })

  test("Key from dataToUpdate missing from jsToSQL - Missing contingency", function() {

    const dataToUpdate = {
      firstName: 'Testio',
      lastName: 'McTest',
      favNo: 10
    }

    const jsToSQL = {
      firstName: 'first_name',
      lastName: 'last_name',
      zodiacSign: 'zodiac_sign',
      // favNo: 'favorite_number',
      birthday: 'birthday'
    }

    // This does not throw an error at this stage, but will in sql
    const expectedResult = {
      setCols: '\"first_name\"=$1, \"last_name\"=$2, \"favNo\"=$3',
      values: ['Testio', 'McTest', 10]
    }

    const outputObj = sqlForPartialUpdate(dataToUpdate, jsToSQL);

    expect(outputObj).toEqual(expectedResult);

  })

})