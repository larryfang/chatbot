const axios = require('axios');
const {POSTCODE_API, POSTCODE_AUTH_KEY, PRESENTATION_API, PRICES_API} = require('./api.constants');

function lookupPostcode(postcode) {
    return new Promise((resolve, reject) => {
        axios.get(`${POSTCODE_API}${postcode}`, {headers: {'AUTH-KEY': POSTCODE_AUTH_KEY}})
          .then((response) => {
              const {localities} = response.data;
              if (localities === '') {
                  reject('Postcode not found');
              } else {
                  let {locality} = localities;

                  if (Array.isArray(locality)) {
                      locality = locality[0];
                  }

                  resolve({
                      location: locality.location,
                      postcode: locality.postcode,
                      state: locality.state
                  });
              }
          });
    });
}

function getPackagingTypes() {
    return [
        {
            label: '500g satchel',
            id: 'PKSS'
        },
        {
            label: '3kg satchel',
            id: 'PKSM'
        }
    ];
}

function getPresentationMetadata() {
    const packagingTypeIds = getPackagingTypes().map((packagingType) => packagingType.id);
    return axios.get(PRESENTATION_API)
      .then((response) => {
          return response.data.services.map((service) => {
              return {
                  serviceId: service.id,
                  products: service.products.filter((product) => packagingTypeIds.includes(product.packaging_type))
              }
          })
      });
}

function getDeliveryOptions(fromPostcode, toPostcode, selectedPackagingTypeId) {
    return getPresentationMetadata()
      .then((products) => {
          return axios.post(PRICES_API, {
              from: { postcode: fromPostcode },
              to: { postcode: toPostcode },
              items: products.map((product) => ({
                  item_reference: product.serviceId,
                  product_ids: product.products.filter((product) => product.packaging_type === selectedPackagingTypeId).map((product) => product.id)
              }))
          });
      });
}

module.exports = {
    lookupPostcode,
    getPackagingTypes,
    getDeliveryOptions
};