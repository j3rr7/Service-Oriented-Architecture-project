/**
 * Attempt to cache pokemon stats from rapidAPI
 */
let CachePokemonData2 = () => {
    let fs = require('fs');
    let axios = require('axios');
    let options = {
        method: 'GET',
        url: 'https://pokemon-go1.p.rapidapi.com/pokemon_stats.json',
        headers: {
            'x-rapidapi-key': 'c3da140abamsh49ffb2e98f067d7p14bb56jsn157f3859ac67',
            'x-rapidapi-host': 'pokemon-go1.p.rapidapi.com'
        }
    };
    axios.request(options).then(function (response) {
        fs.writeFile('pokemon_stats.json', response.data, function (err) {
            if (err) return console.log(err);
            console.info('Data Cached');
        });
    }).catch(function (error) {
        console.error(error);
    });
}

/**
<summary>
 Cache Data from PokeAPI and save to json file
</summary>
 */
let CachePokemonData = async () => {
    let pokemon_data_from_url = (await axios.get('https://pokeapi.co/api/v2/pokemon?offset=0&limit=100')).data;
    let stream = fs.createWriteStream("pokemon_data.json", {flags:'a'});
    let data = []
    for (let elem of pokemon_data_from_url.results) { data.push(elem); }
    while(pokemon_data_from_url.next !== null) {
        pokemon_data_from_url = (await axios.get(pokemon_data_from_url.next)).data;
        for (let elem of pokemon_data_from_url.results) { data.push(elem); }
    }
    stream.write(JSON.stringify(data,null,4));
    stream.end();
    console.log("POKEMON CACHED");
}

/**
<summary>
    Utility function to randomized string as "api-key"
    Basically creating array contains randomized letter and join that letter together
    PS : Note for self = learn more javascript :v i prefer how python this this in single line -jere
</summary>
 */
// ToDo : Seperate File for utils function (- maybe not needed)
function GenerateApiKey( length ) {
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.apply(0, Array(length)).map(function() {
        return (
            function(charset){
                return charset.charAt(Math.floor(Math.random() * charset.length))
            }(characters)
        );
    }).join('');
}

module.exports = {
    GenerateApiKey : GenerateApiKey,
}