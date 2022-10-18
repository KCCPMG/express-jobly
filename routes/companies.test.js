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

const Company = require("../models/company");


beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };




  /** this test used to be "ok for users"
   * permission changed to admin only, should fail
   * for regular users
   * */ 

  test("not ok for users (non-admin)", async function () {
    const resp = await request(app)
        .post("/companies")
        .send(newCompany)
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
        .post("/companies")
        .send(newCompany)
        .set("authorization", `Bearer ${adminUserToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  })

  // changing from u1Token to adminUserToken to correctly test
  test("bad request with missing data", async function () {

    const resp = await request(app)
        .post("/companies")
        .send({
          handle: "new",
          numEmployees: 10,
        })
        .set("authorization", `Bearer ${adminUserToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  // changing from u1Token to adminUserToken to correctly test
  test("bad request with invalid data", async function () {

    const resp = await request(app)
        .post("/companies")
        .send({
          ...newCompany,
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${adminUserToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies:
          [
            {
              handle: "c1",
              name: "C1",
              description: "Desc1",
              numEmployees: 1,
              logoUrl: "http://c1.img",
            },
            {
              handle: "c2",
              name: "C2",
              description: "Desc2",
              numEmployees: 2,
              logoUrl: "http://c2.img",
            },
            {
              handle: "c3",
              name: "C3",
              description: "Desc3",
              numEmployees: 3,
              logoUrl: "http://c3.img",
            },
          ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
        .get("/companies")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });


  test("succeeds with query", async function(){
    const resp = await request(app).get("/companies?minEmployees=2&maxEmployees=3");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.companies.length).toBe(2);
  })


  test("succeeds with query 2", async function(){
    const resp = await request(app).get("/companies?minEmployees=1&maxEmployees=3&name=c1");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.companies.length).toBe(1);
    expect(resp.body.companies[0].name).toBe('C1');
  })


  test("ignores bad query parameter", async function(){
    const resp = await request(app).get("/companies?minEmployees=2&maxEmployees=3bus&badquery=badquery");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.companies.length).toBe(2);
  })


  test("fails with inconsistent employee counts", async function(){
    const resp = await request(app).get("/companies?minEmployees=500&maxEmployees=300");
    expect(resp.statusCode).toBe(400);
    expect(resp.text).toBe("minEmployees cannot be greater than maxEmployees");

  })

});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs: [
          {
            id: sampleJobs[0].id,
            title: sampleJobs[0].title,
            salary: sampleJobs[0].salary,
            equity: sampleJobs[0].equity
          }
        ]
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {

    const c4 = await Company.create({
      handle: "c4",
      name: "C4",
      description: "Desc4",
      numEmployees: 4,
      logoUrl: "http://c4.img"
    })

    const resp = await request(app).get(`/companies/c4`);
    expect(resp.body).toEqual({
      company: {
        handle: "c4",
        name: "C4",
        description: "Desc4",
        numEmployees: 4,
        logoUrl: "http://c4.img",
        jobs: []
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {

  // assigning adminUserToken to correctly test
  test("works for admin users", async function () {

    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          name: "C1-new",
        })
        .set("authorization", `Bearer ${adminUserToken}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          name: "C1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non-admin user", async function() {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          name: "C1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  })

  // assigning adminUserToken to correctly test
  test("not found on no such company", async function () {

    const resp = await request(app)
        .patch(`/companies/nope`)
        .send({
          name: "new nope",
        })
        .set("authorization", `Bearer ${adminUserToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  // assigning adminUserToken to correctly test
  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          handle: "c1-new",
        })
        .set("authorization", `Bearer ${adminUserToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  // assigning adminUserToken to correctly test
  test("bad request on invalid data", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${adminUserToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {

  // assigning adminUserToken to correctly test
  test("works for admin users", async function () {
    const resp = await request(app)
        .delete(`/companies/c1`)
        .set("authorization", `Bearer ${adminUserToken}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non-admin users", async function(){
    const resp = await request(app)
        .delete(`/companies/c1`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  })

  // assigning adminUserToken to correctly test
  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`/companies/nope`)
        .set("authorization", `Bearer ${adminUserToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
