const axios = require('axios');

const POSTCODE_API = 'https://digitalapi.auspost.com.au/postcode/search?limit=10&q=';
const AUTH_KEY = '62b9613ddab3f8cdaf89c47c0234729e';

function lookupPostcode(postcode) {
    return new Promise((resolve, reject) => {
        axios.get(`${POSTCODE_API}${postcode}`, { headers: { 'AUTH-KEY': AUTH_KEY }})
            .then((response) => {
                const { localities } = response.data;
                if(localities === '') {
                    reject('Postcode not found');
                } else {
                    const { locality } = localities;

                    if(Array.isArray(locality)) {
                        reject('More than one postcode found');
                    } else {
                        resolve({
                            location: locality.location,
                            postcode: locality.postcode,
                            state: locality.state
                        });
                    }
                }
            });
    });
}

module.exports = {
    lookupPostcode
};