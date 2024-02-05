const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'covid19India.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

const changingToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const districtToResponseObject = districtObj => {
  return {
    districtId: districtObj.district_id,
    districtName: districtObj.district_name,
    stateId: districtObj.state_id,
    cases: districtObj.cases,
    cured: districtObj.cured,
    active: districtObj.active,
    deaths: districtObj.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const gettingStates = `
  SELECT * FROM state ORDER BY state_id;
  `
  const states = await db.all(gettingStates)
  const stateResult = states.map(each => {
    return changingToResponseObject(each)
  })
  response.send(stateResult)
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const stateQuery = `
  SELECT * FROM state WHERE state_id = ${stateId};
  `
  const state = await db.get(stateQuery)
  response.send(changingToResponseObject(state))
})

app.post('/districts/', async (request, response) => {
  const districtBody = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtBody

  const districtQuery = `
  INSERT INTO 
    district (district_name, state_id, cases, cured, active, deaths)
  VALUES
    (
      "${districtName}",
      ${stateId},
      ${cases},
      ${cured},
      ${active},
      ${deaths}
    );
  `
  const addDistrict = await db.run(districtQuery)
  const districtId = addDistrict.lastId
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtQuery = `
  SELECT * FROM district WHERE district_id = ${districtId};
  `
  const district = await db.get(districtQuery)
  const districtResult = districtToResponseObject(district)
  response.send(districtResult)
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDeleteQuery = `
  DELETE FROM district WHERE district_id = ${districtId};
  `
  await db.run(districtDeleteQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const districtUpdateQuery = `
  UPDATE 
    district
  SET 
    "district_name" = "${districtName}",
    "state_id" =  ${stateId},
    "cases"= ${cases},
    "cured" = ${cured},
    "active"= ${active},
    "deaths"= ${deaths}
  WHERE district_id = ${districtId};
  `

  await db.run(districtUpdateQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats', async (request, response) => {
  const {stateId} = request.params
  const statisticsQuery = `
  SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
  FROM 
    district
  WHERE
    state_id = ${stateId};
  `
  const stats = await db.get(statisticsQuery)
  console.log(stats)

  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getdistrictQuery = `
   select state_id from district
    where district_id = ${districtId};
  `
  const getdistrictQueryResponse = await db.get(getdistrictQuery)
  const getStateNameQuery = `
  select state_name as stateName from state
    where state_id = ${getdistrictQueryResponse.state_id};
  `
  const getStatequeryResponse = await db.get(getStateNameQuery)
  response.send(getStatequeryResponse)
})

module.exports = app
