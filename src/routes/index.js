const { Router } = require('express');
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');
const {Videogame, Genre, Platform} = require("../db.js")
require("dotenv").config();
const {YOUR_API_KEY} = process.env;
// const {v4:uuid} = require("UUID");
const axios = require("axios");
const db = require("../db");

const router = Router();

// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);


//creo una funcion async, que me va a devolver una promesa

const getApiVideogames = async (req,res) => {
    let videogamesArr = [];
    try{
        for (let i = 1; i < 6; i++) {
        const allApiVideogames = await axios.get(`https://api.rawg.io/api/games?key=${YOUR_API_KEY}&page=${i}`);
        allApiVideogames.data.results.map(e=>{ //una vez mapeado los objetos, retorno lo que me importa de los juegos
            videogamesArr.push({
                id: e.id,
                name: e.name,
                background_image: e.background_image,
                released: e.released,
                rating: e.rating,
                platforms: e.platforms.map((e) => e.platform.name),
                genres: e.genres.map((e) => e.name),
              });
    });
    } return videogamesArr;
   
    }catch (error) {
        res.send(error); 
      }
    
}

const getDbInfo = async()=> {
//traigo todos los juegos que hay en mi db son su relacion a los generos
    const arrGames = await Videogame.findAll({
        include:{
            model: Genre,
            attributes: ["name"],
            through: { attributes: []},
        },
    });

    const arrGamesClean = await arrGames.map((e)=>{
        //le hago un map para que me guarde en la const un nuevo array con solo estas propiedades
        return{
            id: e.id,
            name:e.name,
            background_image: e.background_image,
            released: e.released,
            rating: e.rating,
            platforms: e.platforms,
            genres: e.genres.map((el) => el.name),
        };
    });
    return arrGamesClean;
}

const getAllVideogames = async() => {
    const apiInfo = await getApiVideogames();
    const dbInfo = await getDbInfo();
    const infoTotal = apiInfo.concat(dbInfo);
    return infoTotal;
}

//VIDEOGAMES X QUERY 

const apiName = async(name) =>{
    try{
        const queryApi = await axios.get(`https://api.rawg.io/api/games?search=${name}&key=${YOUR_API_KEY}`);
        const queryApiData = await queryApi.data.results;
        const queryApiClean = queryApiData.map((e)=>{
            return {
                id: e.id,
                background_image: e.background_image,
                name: e.name,
                description: e.description,
                released: e.released,
                rating: e.rating,
                platforms: e.platforms.map((e) => e.platform.name),
                genres: e.genres.map((e) => e.name),
              };
        });
        return queryApiClean;
    }catch (error) {
        console.log(error);
      }
   
}

const dbQuery = async (name)=>{
    try{
        const nameGame = await Videogame.findAll({
            //busco en todos los juegos de mi db los que cumplan con la condicion where, o sea q coincida el nombre
          where: { name: name },
          include: {
            model: Genre,
            attributes: ["name"],
            through: {
              attributes: [],
            },
          },
        });
        const nameGameDetail = nameGame.map((e)=>{
            return {
                id: e.id,
                background_image: e.background_image,
                name: e.name,
                description: e.description,
                released: e.released,
                rating: e.rating,
                platforms: e.platforms,
                genres: e.genres.map((el) => el.name),
              };
        });
        return nameGameDetail;
    } catch (error) {
        console.log(error);
      }
}

const allQueryName = async(name)=>{
    const apiInfoQ = await apiName(name);
    const dbInfoQ = await dbQuery(name);
    const allQuery = dbInfoQ.concat(apiInfoQ);
    return allQuery;
}


router.get("/videogames", async (req, res) => {
    const { name } = req.query;
    // console.log(name);
    const allGames = await getAllVideogames(); //creo por fuera la const para llamarla si no me pasan name en el else abajo de todo
    if (name) {
      const videogamesTotal = await allQueryName(name);
      videogamesTotal.length //si mi funcion concatenada de api y db tenia coincidencias o sea elementos
        ? res.send(videogamesTotal.slice(0, 15)) //solo los primeros 100
        : res.status(404).send("this game does not exist"); //sino msj adecuado
      return;
    } else {
      res.status(200).send(allGames);
    }
});

//Ruta por ID
//primero obtengo el id de la api
const apiId = async(id)=>{
    try{
        const idApi= await axios.get( `https://api.rawg.io/api/games/${id}?key=${YOUR_API_KEY}`)
    const idApiData = idApi.data; 
    const idDataClean = {
        id: idApiData.id,
        background_image: idApiData.background_image,
        name: idApiData.name,
        description: idApiData.description.replace(/<[^>]+>/g, ''),
        released: idApiData.released,
        rating: idApiData.rating,
        platforms: idApiData.platforms.map((e) => e.platform.name),
        genres: idApiData.genres.map((e) => e.name),
    };
    return idDataClean;
    } catch (error){
        console.log(error)
    }
    
}
//ahora obtengo el id de la base de datos

const dbId = async (id)=>{
    try{
        const dbGame= await Videogame.findAll({ where: { id: id }, include: [{
            model: Genre,
            attributes: ['id', 'name'], 
            through: { attributes: [] },}],});
            console.log("esto es dbGame")
            console.log(dbGame)
        
        const dataDbGame= dbGame[0];
        console.log("dbGame", JSON.stringify(dbGame));
        console.log("datadbgame", JSON.stringify(dataDbGame));
        return{
            id: dataDbGame.id,
            background_image: dataDbGame.background_image,
            name: dataDbGame.name,
            description: dataDbGame.description,
            released: dataDbGame.released,
            rating: dataDbGame.rating,
            platforms: dataDbGame.platforms,
            genres: dataDbGame.genres.map((e) => e.name),
        }
    } catch(error){
        console.log(error);
    }
}

const allGamesById = async (id)=>{
//incluyo el guion dado que con el guion se genera el uuid asi no me rompe la api
    
    try {
        const uuId = id.includes("-"); //hago una validacion para el uuid
        
        if(uuId){
            // si me pasan id con guiones busco en la db
            const dbIdInfo = await dbId(id);
            return dbIdInfo;
        }
        else {
            //si no tiene id con guiones busco en la api
            const apiIdInfo= await apiId(id);
            // console.log("esto es api de info")
            // console.log(apiIdInfo);
            return apiIdInfo;
        }
    } catch (error) {
        console.log(error)
    }
}


router.get('/videogame/:id', async (req, res) => {
    const { id } = req.params;

    const gamesIdApi = await allGamesById(id);
    gamesIdApi ? res.send(gamesIdApi) : res.send("Wrong ID/This game does not exist");
    return;

});
//ruta generos

const genreTotal = async ()=>{
    const genreDb= await Genre.findAll({
        attributes:{
            exclude:["createdAt", "updatedAt"],
        }
    })
 if(!genreDb.length){
    try{
        const genresApi = await axios.get(`https://api.rawg.io/api/genres?key=${YOUR_API_KEY}`);
    const genreData = await genresApi.data.results;
    const onlyGenre = genreData.map((e)=> e.name);
    onlyGenre.map(
        async (e)=>
        await Genre.findOrCreate({
            //si lo encuentra no lo crea
            where:{
                name: e,
            }
        })
    );
    return onlyGenre
    } catch (error) {
        console.log(error);
     }
 }else{
    return genreDb.map((e)=>e.name); //que solo me traiga el nombre
 }
};

router.get("/genres",async (req,res)=>{
    const allGenres = await genreTotal();
    res.send(allGenres);
})


// const allPlatforms = async()=>{
//     const platforms= await Platform.findAll();
//     if (!platforms.length) {
//         const platformsApi = await axios.get (`http://api.rawg.io/api/platforms?key=${YOUR_API_KEY}`);

//         platforms = await platformsApi.data.results.map((platform) => ({
//             id: platform.id,
//             name: platform.name,
//         }));
//         await Platform.bulkCreate(platforms);
//         platforms = await Platform.findAll();
//     };
//     return platforms;
// }

// router.get("/platforms", async(req,res)=>{
//     const infoPlatforms= await allPlatforms();
//     res.send(infoPlatforms);
// })

router.post("/videogames", async(req,res)=>{
    let { name, description, releaseDate, rating, genres, platforms } = req.body;
    platforms = platforms.toString();
  // platforms = platforms.join(", ");
  try {
    const gameCreated = await Videogame.create({
      //devuelvo un array (OJOOTAA!!!!)
        name,
        description,
        releaseDate,
        rating,
        platforms,
    });
    const vgame_genre = await Genre.findAll({
        where: {name: genres}
    })
    gameCreated.addGenre(vgame_genre)
    // await gameCreated[0].setGenres(genres); // relaciono ID genres al juego creado //me tiraba genreId null ??
    res.send('New video game has been added')
  } catch (err) {
    console.log(err)
  }

})

module.exports = router;
