require('dotenv').config({
  path: `${__dirname}/../.env.${process.env.NODE_ENV}`,
});

describe('Todo', () => {
  it.todo(`NODE_ENV : ${process.env.NODE_ENV}`);
});
