const express = require('express');
const mongoose = require('mongoose');
const {Model} = require('./model');
const Geolib = require('geolib');
const Geo = require('./geo.json');
const config = process.env;
const port = process.env.PORT || 5005;
const app = express();
// ========== middleware parser(3rd/built-in) ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// config routes
app.get('/addLongLat', async (req, res) => {
  console.log('project.id : ', req.body.projectId);
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
mongoose.connect(config.MONGO_URI, {useNewUrlParser: true, useCreateIndex: true}, (err)=>{
	if(err) { 
		console.log('Some problem with the connection ' +err);
	} else {
		console.log('The Mongoose connection is ready');
	}
})
app.listen(port, function () {
	console.log('App listening on port ' + port);
});