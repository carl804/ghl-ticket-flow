export default async function handler(req, res) {
  const response = await fetch("https://services.leadconnectorhq.com/opportunities/search?location_id= + process.env.GHL_LOCATION_ID + &pipeline_id=p14Is7nXjiqS6MVI0cCk&limit=1", {
    headers: {
      "Authorization": "Bearer " + process.env.GHL_ACCESS_TOKEN_TEMP,
      "Version": "2021-07-28"
    }
  });
  const data = await response.json();
  return res.json(data.opportunities[0]);
}
