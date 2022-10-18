"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminUserToken,
  sampleJobs
} = require("./_testCommon");


beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "Test Job",
    salary: 50000,
    equity: null,
    companyHandle: 'c3'
  }




  /** this test used to be "ok for users"
   * permission changed to admin only, should fail
   * for regular users
   * */ 

  test("not ok for users (non-admin)", async function () {
    const resp = await request(app)
      .post('/jobs')
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401
      }
    })
  });

  test("ok for isAdmin users", async function() {

    const resp = await request(app)
      .post('/jobs')
      .send(newJob)
      .set("authorization", `Bearer ${adminUserToken}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body.job).toHaveProperty('title', newJob.title);
    expect(resp.body.job).toHaveProperty('salary', newJob.salary);
    expect(resp.body.job).toHaveProperty('equity', newJob.equity);
    expect(resp.body.job).toHaveProperty('companyHandle', newJob.companyHandle);

  })

  // changing from u1Token to adminUserToken to correctly test
  test("bad request with missing data", async function () {

    const resp = await request(app)
      .post('/jobs')
      .send({
        title: "Test Job",
        salary: 50000,
        equity: null
        // no companyHandle
      })
      .set("authorization", `Bearer ${adminUserToken}`);

    expect(resp.statusCode).toEqual(400);
    
  });

  // changing from u1Token to adminUserToken to correctly test
  test("bad request with invalid data", async function () {

    const resp = await request(app)
      .post('/jobs')
      .send({
        title: "Test Job",
        salary: 50000,
        equity: null,
        companyHandle: 17
      })
      .set("authorization", `Bearer ${adminUserToken}`);

    expect(resp.statusCode).toEqual(400);
    
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {

  test("ok for anon", async function () {
    const resp = await request(app).get('/jobs');

    expect(resp.statusCode).toBe(200);
    expect(resp.body).toHaveProperty('jobs');
    expect(Array.isArray(resp.body.jobs)).toBe(true);
    expect(resp.body.jobs.length).toBeGreaterThanOrEqual(3);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });


  test("succeeds with query", async function() {
    const resp = await request(app).get("/jobs?title=f&hasEquity=true");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.jobs).toEqual([{
      ...sampleJobs[1],
      equity: String(sampleJobs[1].equity)
    }])
  })

});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/${sampleJobs[0].id}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body.job).toEqual(sampleJobs[0]);
  });


  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {

  const updateData = {
    title: "Updater",
    salary: 99999,
    equity: 0.00211
  }

  // assigning adminUserToken to correctly test
  test("works for admin users", async function () {

    const resp = await request(app)
      .patch(`/jobs/${sampleJobs[0].id}`)
      .send(updateData)
      .set("authorization", `Bearer ${adminUserToken}`)

    expect(resp.statusCode).toBe(200);
    expect(resp.body.job).toEqual({
      id: sampleJobs[0].id,
      companyHandle: sampleJobs[0].companyHandle,
      ...updateData,
      equity: String(updateData.equity)
    })

  });

  test("unauth for anon", async function () {
    
    const resp = await request(app)
      .patch(`/jobs/${sampleJobs[0].id}`)
      .send(updateData)

    expect(resp.statusCode).toBe(401);

  });

  test("unauth for non-admin user", async function() {
    
    const resp = await request(app)
      .patch(`/jobs/${sampleJobs[0].id}`)
      .send(updateData)
      .set("authorization", `Bearer ${u1Token}`)

    expect(resp.statusCode).toBe(401);

  })

  // assigning adminUserToken to correctly test
  test("not found on no such job", async function () {

    const resp = await request(app)
      .patch(`/jobs/0`)
      .send(updateData)
      .set("authorization", `Bearer ${adminUserToken}`)

    expect(resp.statusCode).toBe(404);


  });

  // assigning adminUserToken to correctly test
  test("bad request on handle change attempt", async function () {
    
    const resp = await request(app)
      .patch(`/jobs/${sampleJobs[0].id}`)
      .send({
        companyHandle: "c17"
      })
      .set("authorization", `Bearer ${adminUserToken}`)

    expect(resp.statusCode).toBe(400);


  });

  // assigning adminUserToken to correctly test
  test("bad request on invalid data", async function () {
    
    const resp = await request(app)
      .patch(`/jobs/${sampleJobs[0].id}`)
      .send({
        company_handle: "c3"
      })
      .set("authorization", `Bearer ${adminUserToken}`)

    expect(resp.statusCode).toBe(400);

  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {

  // const adminUserToken = createToken({ username: "u4", isAdmin: true });

  // assigning adminUserToken to correctly test
  test("works for admin users", async function () {
    const resp = await request(app)
      .delete(`/jobs/${sampleJobs[0].id}`)
      .set("authorization", `Bearer ${adminUserToken}`)

    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({
      deleted: String(sampleJobs[0].id)
    })
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/jobs/${sampleJobs[0].id}`)

    expect(resp.statusCode).toBe(401);
  });

  test("unauth for non-admin users", async function(){
    const resp = await request(app)
      .delete(`/jobs/${sampleJobs[0].id}`)
      .set("authorization", `Bearer ${u1Token}`)

    expect(resp.statusCode).toBe(401);
  })

  // assigning adminUserToken to correctly test
  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/jobs/0`)
      .set("authorization", `Bearer ${adminUserToken}`)

    expect(resp.statusCode).toBe(404);
    
  });
});
