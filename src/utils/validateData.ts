import { getAllowedFields, splitFields, isObject, checkConditions } from './utils';
import { FieldsWithConditions, ValidateDataResponse } from '../types';
import get from '@strikeentco/get';

const validatePositiveFields = (data: object, fields: string[], _prefix?: string) => {
  try {
    if (fields.length === 0 || fields.includes('*')) return { valid: true };
    const prefix = _prefix || '';
    const keys = Object.keys(data);
    keys.forEach((key) => {
      const fieldName = prefix + key;
      if (fields.some(item => item === fieldName)) {
        return true;
      }
      const value = get(data, key);
      if (isObject(value)) {
        if (fields.some((item) => item.startsWith(`${fieldName}.`))) {
          const deepCheck = validatePositiveFields(value, fields, `${fieldName}.`);
          if (deepCheck.valid) {
          	return true;
          }
          throw new Error(deepCheck.message);
        }
        throw new Error(`${fieldName} is not allowed`);
      }
      throw new Error(`${fieldName} is not allowed`);
    });
    return { valid: true };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};

const validateNegativeFields = (data: object, fields: string[]) => {
  try {
    if (fields.length === 0) return { valid: true };
    fields.forEach((field: string) => {
      if (typeof get(data, field) !== 'undefined') {
        throw new Error(`${field} is not allowed`);
      }
    });
    return { valid: true };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};
export const validateObject = (
  data: {},
  fields: null | string[],
  fieldsWithConditions: null | FieldsWithConditions[]
): ValidateDataResponse => {
  const allowedFields = getAllowedFields(data, fields, fieldsWithConditions);
  const { positiveFields, negativeFields } = splitFields(allowedFields);
  const negativeFieldsRes = validateNegativeFields(data, negativeFields);
  if (!negativeFieldsRes.valid) return negativeFieldsRes;
  return validatePositiveFields(data, positiveFields);
};

export const validateData = (
  data: object[] | object,
  fields: null | string[],
  fieldsWithConditions: null | FieldsWithConditions[],
  mongooseWhere?: object 
  ): ValidateDataResponse => {
  const isArray = Array.isArray(data);
  try {
    if(mongooseWhere && !checkConditions(mongooseWhere, data)){
      throw new Error('The data structure does not fit your permissions');
    }
    if (isArray) {
      (data as Array<{}>).map(item => {
        const checkResult = validateObject(item, fields, fieldsWithConditions);
        if (!checkResult.valid) {
          throw new Error(checkResult.message);
        }
      });
      return { valid: true };
    } else {
      return validateObject(data, fields, fieldsWithConditions);
    }
  } catch (error) {
    return { valid: false, message: error.message };
  }
};