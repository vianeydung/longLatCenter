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
  const Model = client.db(req.body.dbName).collection("primary-transactions");
  const units = await Model.find({'project.id': req.body.projectId});
  // console.log(Geo);
  for (const unit of units) {
    if(unit.customer && unit.customer.info && unit.customer.info.address.province && unit.customer.info.address.district){
      console.log('unit.id : ', unit.id);
      console.log('address : ', unit.customer.info.address.fullAddress);
      const objProvince = Geo.find(g => unit.customer.info.address.province.includes(g.name));
      if(objProvince){
        const objDistricts = objProvince.districts.find(g => unit.customer.info.address.district.includes(g.name));
        if(objDistricts){
          const bounds = objDistricts.latlngs.map(g => {
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
          Model.updateOne({id: unit.id}, {'customer': unit.customer})
          .then(res => {
            console.log(res);
          })
          .catch(err => console.log(err))
          ;
        }
      }
      
    }
  }
  res.send('success');
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