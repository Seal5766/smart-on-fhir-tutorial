(function(window){
  window.extractData = function(client) {
    var ret = $.Deferred();

    function onError(err) {
      console.log('Loading error', err);
      ret.reject(err);
    }

    function onReady(client) {
      if (client.patient && client.patient.id) {
        var patient = client.patient;
        var pt = patient.read();
        var obv = client.request("/Observation", {
          pageLimit: 0,
          flat: true,
          params: {
            code: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                   'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                   'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
          }
        });

        $.when(pt, obv).fail(onError);

        $.when(pt, obv).done(function(patient, observations) {
          var byCodes = function(code) {
            return observations.filter(function(ob) {
              if (ob.code && ob.code.coding) {
                return ob.code.coding.some(function(c) {
                  return c.code === code;
                });
              }
              return false;
            });
          };

          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (patient.name && patient.name[0]) {
            if (patient.name[0].given) {
              fname = patient.name[0].given.join(' ');
            }
            if (patient.name[0].family) {
              lname = patient.name[0].family;
              if (Array.isArray(lname)) {
                lname = lname.join(' ');
              }
            }
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined') {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          ret.resolve(p);
        });
      } else {
        onError('Patient context not found');
      }
    }

    // Call onReady with the provided client
    onReady(client);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: '',
      lname: '',
      gender: '',
      birthdate: '',
      height: '',
      systolicbp: '',
      diastolicbp: '',
      ldl: '',
      hdl: '',
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
  };

})(window);
