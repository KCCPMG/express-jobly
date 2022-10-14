"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");
const Company = require("../models/company");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const db = require("../db");

const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * company should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: isAdmin
 */

router.post('/', ensureAdmin, async (req, res, next) => {
  try {
    
    // validate schema
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }
    
    // verify valid company handle
    const company = await Company.get(req.body.companyHandle);
    if (!company) {
      throw new BadRequestError("Invalid companyHandle");
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job })
  } catch(err) {
    return next(err);
  }
})


/** GET /  =>
 *   { jobs: [ { title, salary, equity, companyHandle }, ...] }
 *
 * Cannot filter at moment
 *
 * Authorization required: none
 */
router.get('/', async (req, res, next) => {
  try {

    const { title, minSalary, hasEquity } = req.query;

    const jobs = await Job.findAll(title, minSalary, hasEquity);
    return res.json({ jobs });
  } catch(err) {
    return next(err);
  }
})


/** GET /[id]  =>  { job }
 *
 *  Company is { id, title, salary, equity, companyHandle }
 *
 * Authorization required: none
 */
router.get('/:id', async (req, res, next) => {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });

  } catch(err) {
    return next(err);
  }
})

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: isAdmin
 */
router.patch('/:id', ensureAdmin, async (req, res, next) => {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    // else
    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });

  } catch(err) {
    return next(err);
  }
})


/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: isAdmin
 */

router.delete('/:id', ensureAdmin, async (req, res, next) => {
  try {
    await Job.remove(req.params.id);
    return res.json({ deleted: req.params.id })
  } catch(err) {
    return next(err);
  }
})



module.exports = router;