"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);



/************************************** create */

describe("create", function () {
  const newJob = {
    title: "Assistant to the Regional Manager",
    salary: 75000,
    equity: 0.005,
    companyHandle: "c3"
  };

  test("works", async function () {
    const job = await Job.create(newJob);
    const result = await db.query(`
      SELECT title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      WHERE id = $1
    `, [job.id])

    newJob.equity = String(newJob.equity);
    expect(result.rows[0]).toEqual(newJob);

  });


});

/************************************** findAll */

describe("findAll", function () {

  test("works: no filter", async function () {
    const jobs = await Job.findAll();
    expect(jobs.length).toBe(3);
  });

  test("works with filter", async function() {
    const jobs = await Job.findAll("f", null, true)
    expect(jobs.length).toBe(1);
    expect(jobs[0].title).toBe("Founder");
  })
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const jobs = await Job.findAll();
    const firstJob = jobs[0];

    const job = await Job.get(firstJob.id);
    expect(job).toEqual(firstJob);

  });

  test("not found if no such job", async function () {
    try {
      await Job.get(0);
      fail();
    } catch(err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "New Title",
    salary: 123456,
    equity: 0.999
  };

  test("works", async function () {
    const jobs = await Job.findAll();
    const firstJob = jobs[0];

    const updatedJob = await Job.update(firstJob.id, updateData);
    expect(updatedJob).toEqual({
      id: firstJob.id,
      companyHandle: firstJob.companyHandle,
      equity: String(updateData.equity),
      title: updateData.title,
      salary: updateData.salary
    })
    // expect(updatedJob.title).toBe(updateData.title);
    // expect(updatedJob.salary).toBe(updateData.salary);
    // expect(updatedJob.equity).toBe(updateData.equity);
  });

  test("works: null fields", async function () {
    const jobs = await Job.findAll();
    const firstJob = jobs[0];

    const updatedJob = await Job.update(firstJob.id, {
      title: "New Title",
    });

    expect(updatedJob).toEqual({
      title: "New Title",
      equity: firstJob.equity, 
      id: firstJob.id,
      salary: firstJob.salary,
      companyHandle: firstJob.companyHandle
 
    })
  });

  test("not found if no such job", async function () {
    const jobs = await Job.findAll();
    const firstJob = jobs[0];

    try {
      const updatedJob = await Job.update(0, updateData);
      fail();
    } catch(e) {
      expect(e instanceof NotFoundError).toBeTruthy();
    }

  });

  test("bad request with no data", async function () {
    const jobs = await Job.findAll();
    const firstJob = jobs[0];

    try {
      const updatedJob = await Job.update(firstJob.id, {});
      fail();
    } catch(err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }

  });
});

/************************************** remove */

describe("remove", function () {

  test("works", async function () {
    const jobs = await Job.findAll();
    const firstJob = jobs[0];
    const del = await Job.remove(firstJob.id)
    expect(del).toBe(undefined);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch(err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
