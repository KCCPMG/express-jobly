"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   * 
   * data should be {title, salary, equity, company_handle}
   * 
   * Returns { id, title, salary, equity, company_handle }
   * 
   * Duplicates are allowed permitted they do not override a pre-existing id
   * 
   * Throws BadRequestError if company_handle is invalid (needs to link to table 'companies' on column 'handle')
   */

  static async create({ title, salary, equity, companyHandle }){
    const company_check = await db.query(`
      SELECT *
      FROM companies
      WHERE handle = $1
    `, [companyHandle]);
  
    if (company_check.rows.length === 0) {
      throw new BadRequestError(`Company handle ${companyHandle} not found`)
    } else {
      const job = await db.query(`
        INSERT INTO jobs
        (title, salary, equity, company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"
      `, [title, salary, equity, companyHandle]);

      return job.rows[0];
    }

  }
  
  /** Find all jobs.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * 
   * accepts up to three arguments:
   * title, minSalary, hasEquity
   * 
   * After collecting all companies, will filter on all
   * provided arguments by:
   * 
   * title (String): job title includes title (case insensitive)
   * minSalary (Number): salary euqal to or greater than and
   * not null
   * hasEquity (boolean): if true, lists all jobs with non-zero
   * and non-null amount of equity. If false or not provided,
   * does not filter by this criteria
   * 
   * */
  
  static async findAll( title, minSalary, hasEquity ) {
    const jobsRes = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs`
    )

    return jobsRes.rows.filter(row => {

      if (title) {
        if (!row.title.match(RegExp(title, 'i'))) {
          return false;
        }
      }

      if (minSalary) {
        if (row.salary === null || row.salary < minSalary) {
          return false;
        }
      }

      if (hasEquity) {
        if (row.equity === null || row.equity == 0) {
          return false;
        }
      }

      // else to all above
      return true;

    })
  }

  /** Given a job id, return data about job
   * 
   * Returns { id, title, salary, equity, company_handle }
   * 
   * Throws NotFoundError if not found.
   */

  static async get(id) {
    const jobRes = await db.query(`
      SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      WHERE id = $1
    `, [id])

    if (jobRes.rows.length === 0) {
      throw new NotFoundError(`No job: ${id}`);
    } else {
      return jobRes.rows[0];
    }
  }

  /** Get job by id and update with data
   * 
   * Data can include {title, salary, equity}
   * 
   * id and company_handle will never be updated
   * 
   * Returns {id, title, salary, equity, companyHandle}
   * 
   * Throws NotFoundError if not found.
   */
  static async update(id, data) {
    // no need to translate column names
    const { setCols, values } = sqlForPartialUpdate(data, {});

    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);

    if (result.rows.length === 0) {
      throw new NotFoundError(`No job: ${id}`);
    } else return result.rows[0];
    
  }

  /** Delete given job from databse; returns undefined
   * 
   * Throws NotFoundError if job not found.
   */


  static async remove(id) {
    const result = await db.query(
      `DELETE
       FROM jobs
       WHERE id = $1
       RETURNING id`,
    [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError(`No job: ${id}`);
    } else return;
  }
}

module.exports = Job;