const express = require('express');
// const mongoose = require('mongoose');
const {MongoClient} = require('mongodb');
// const {Model} = require('./model');
const Geolib = require('geolib');
const Geo = require('./geo.json');
const config = process.env;
const port = config.PORT || 5005;
const app = express();
const client = new MongoClient(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
// ========== middleware parser(3rd/built-in) ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// config routes
app.post('/api/patchFloor', async (req, res) => {
  console.log(req.body.projectId);
  const floorId = "00313c2b-ee59-4760-ad51-bf504fd1a5e9";
	const blockId = "0f76e8fc-ad24-47d3-ad4b-987f8fd22fea";
  const Model = client.db(req.body.dbName).collection("property-units");
  const unit = Model.find({
    'project.id': req.body.projectId,
    // 'id': '5e22c698-a983-4f84-aa25-2765cbe65150'
    });
  await Model.updateMany({
    'project.id': req.body.projectId,
    // 'id': '5e22c698-a983-4f84-aa25-2765cbe65150'
    },[{
    $set: {
       floor: {$arrayElemAt: [{ 
                
                
                $map: {
                    input: {
                        $filter: { input: "$attributes", as: "item", cond: { $eq: ["$$item.id", floorId] } } 
                        },
                    "as": "a",
                    "in": "$$a.value"
                } }, 0]},
        block: {$arrayElemAt: [{ 
                
                
                $map: {
                    input: {
                        $filter: { input: "$attributes", as: "item", cond: { $eq: ["$$item.id", blockId] } } 
                        },
                    "as": "a",
                    "in": "$$a.value"
                } }, 0]}
     }
      // block: {$eq: [ "$attributes.id", blockId ]}
      // { active: { $eq: [ "$a", "Hello" ] } }
  }]
  ).then(u => {
    console.log(u);
    res.send(u);
  })
  // const units = await Model.find({'project.id': req.body.projectId}).toArray();
  // const floorId = "00313c2b-ee59-4760-ad51-bf504fd1a5e9";
	// const blockId = "0f76e8fc-ad24-47d3-ad4b-987f8fd22fea";

  // for (const unit of units) {
  //   console.log(unit.id);
  //   if(unit.attributes && unit.attributes.length > 0){
  //     const floor = unit.attributes.find(att => att.id === floorId);
  //     const block = unit.attributes.find(att => att.id === blockId);
  //     if(floor && block){
  //       await client.db(req.body.dbName).collection("property-units").updateOne({
  //         id: unit.id,
  //       },{
  //         $set: {floor: floor.value, block: block.value}
  //       }, {upsert: true}
  //       );
  //     }
  //   }
  // }
  // console.log('success');
  // res.send('success');
});
// config routes
app.get('/addLongLat', async (req, res) => {
  // const Model = client.db('msx-property-readmodel').collection("primary-transactions");
  const Model = client.db(req.body.dbName).collection("primary-transactions");
  let projects = null;
  if(req.body.projectId){
    projects = [{id: req.body.projectId}]
  } else {
    projects = await Model.find({}, {'id': 1}).toArray();
  }
  if(!projects){
    res.send('fail');
    return;
  }
  const projectIds = projects.map(p => p.id);
  const units = await Model.find({
    'project.id': {$in: projectIds},
    'customer.location': {$in:[null,{}], $exists: false},
    // 'id': '00221bb7-8e76-4ce6-b3e9-f6c2429f7ee5'
  }).toArray();
  // console.log(Geo);
  for (const unit of units) {
    if(unit.customer && unit.customer.info && unit.customer.info && unit.customer.info.address && unit.customer.info.address.province && unit.customer.info.address.district){
      console.log('unit.id : ', unit.id);
      console.log('address : ', unit.customer.info.address.fullAddress);
      const province = unit.customer.info.address.province.replace(/[–-]/g, '');
      const district = unit.customer.info.address.district.replace(/[–-]/g, '');
      console.log(province, district);
      const geoProvince = Geo.find(g => {
        console.log(g.name);
        const str = g.name.replace(/[–-]/g, '');
        return province.includes(str);
      });
      // console.log(geoProvince);
      if(geoProvince){
        const match = district.match(/([QHqh]+\.\s+)(\d+)/i);
        const match1 = district.match(/([tpTPtxTX]{2}\.\s+)(.+)/i);
        console.log(match);
        const geoDistricts = geoProvince.districts.find(g => {
          const str = g.name.replace(/[–-]/g, '');
          return (
          district.includes(str) || 
          (match && match.length > 1 && g.name.includes(match[2])) ||
          (match1 && match1.length > 1 && g.name.includes(match1[2]))
          )
        });
        console.log(geoDistricts);
        if(geoDistricts){
          const bounds = geoDistricts.latlngs.map(g => {
            return {
              longitude: g[0],
              latitude:  g[1]
            }
          })
          const point = Geolib.getCenterOfBounds(bounds);
          console.log(point);
          unit.customer.location = {
            type: 'point',
            coordinates: point
          }
          Model.updateOne({
            id: unit.id,
            'customer.location': {$in:[null,{}], $exists: false}
          }, {$set: {'customer': unit.customer}})
          .then(res => {
            // console.log(res);
          })
          .catch(err => console.log(err))
          ;
        }
      }
      
    }
  }
  res.send('success');
  return;
})

console.log(config);
// mongoose.connect(config.MONGO_URI, {useNewUrlParser: true, useCreateIndex: true}, (err)=>{
// 	if(err) { 
// 		console.log('Some problem with the connection ' +err);
// 	} else {
// 		console.log('The Mongoose connection is ready');
// 	}
// })
  client.connect()
  .then(res => {
    if(res){
      console.log('The Mongodb connection is ready');
    } else {
      console.log('Some problem with the connection');
    }
  })
  .catch(err => console.log('Some problem with the connection ' +err))

app.listen(port, function () {
	console.log('App listening on port ' + port);
});