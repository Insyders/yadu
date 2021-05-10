/* eslint-disable max-len */
module.exports = {
  base: {
    declaration: {
      attributes: {
        version: '1.0',
        encoding: 'UTF-8',
      },
    },
    elements: [
      {
        type: 'element',
        name: 'databaseChangeLog',
        attributes: {
          xmlns: 'http://www.liquibase.org/xml/ns/dbchangelog',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation':
            'http://www.liquibase.org/xml/ns/dbchangelog\n\t\t\t\t\t\thttp://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.1.xsd',
        },
        elements: [],
      },
    ],
  },
  element: {
    type: 'element',
    name: 'include',
    attributes: {
      file: '',
    },
  },
};
