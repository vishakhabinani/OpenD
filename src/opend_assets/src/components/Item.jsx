import React, {useEffect, useState} from "react";
import logo from "../../assets/logo.png";
import {Principal} from "@dfinity/principal";
import {Actor,HttpAgent} from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import Button from "./Button";
import { opend } from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) {
  const [name,setName]=useState();
  const [owner,setOwner]=useState();
  const [image,setImage]=useState();
  const [button,setButton]=useState();
  const [priceInput,setPriceInput]=useState();
  const [loaderHidden,setLoaderHidden]=useState(true);
  const [blur,setBlur]=useState();
  const [sellStatus,setStatus]=useState("");
  const [priceLabel,setPriceLabel]=useState();
  const [shouldDisplay,setDisplay] = useState(true);
  

const id=props.id; //this canisterid of nft got passed over from App.jsx 

const localHost="http://localhost:8080/";
const agent=new HttpAgent({host:localHost});  //a new HttpAgent instance is created,responsible for interacting with the IC blockchain and handling network communication. The host property is set to localHost to specify that the agent should connect to the IC through the local development server
agent.fetchRootKey(); //when deploying live, remove this line
let NFTActor;

async function loadNFT() //The code essentially sets up a connection to the NFT canister on the local development server using the HttpAgent. The loadNFT() function then creates an Actor instance, which represents the NFT canister and provides methods to interact with its functions and data. This Actor instance will be used in subsequent parts of your frontend code to query the NFT canister for information, mint new NFTs, or perform other actions.
{
  //The idlFactory defines the interface of the NFT canister.
  //The Actor instance provides a way to interact with the canister's functions.
  NFTActor=await Actor.createActor(idlFactory,{
    agent,
    canisterId:id, 
  });

  const name=await NFTActor.getName();
  setName(name);

  const owner=await NFTActor.getOwner(); //output of this function is principal id
  setOwner(owner.toText());

  const imageData=await NFTActor.getAsset();
  const imageContent=new Uint8Array(imageData);
  const image=URL.createObjectURL(
    new Blob ([imageContent.buffer],{type:"image/png"})
  );

  setImage(image);


  if(props.role=="collection") {

  const nftIsListed=await opend.isListed(props.id);

  if(nftIsListed) //render correct UI if an NFT is listed.
    {
    setOwner("OpenD");
    setBlur({filter:"blur(4px)"});
    setStatus(" Listed");
    } else{
    setButton(<Button handleClick={handleSell} text={"Sell"}  />);

   }
 } else if(props.role=="discover"){

  const originalOwner= await opend.getOriginalOwner(props.id);
  if(originalOwner.toText() != CURRENT_USER_ID.toText()) {
    setButton(<Button handleClick={handleBuy} text={"Buy"}  />); 
  }

  const price= await opend.getListedNFTPrice(props.id);
  setPriceLabel(<PriceLabel sellPrice={price.toString()} />);

  

 }
 

}

useEffect(()=>{
  loadNFT();
},[]);

let price;

function handleSell(){
  console.log("Sell Clicked");
  setPriceInput(<input
    placeholder="Price in $"
    type="number"
    className="price-input"
    value={price}
    onChange={(e)=> price=e.target.value}
  />)
  setButton(<Button handleClick={sellItem}  text={"Confirm"} />);

}

async function sellItem(){
  setBlur({filter:"blur(4px)"});
  //setLoaderHidden(false);
  //console.log(price);
  const listingResult=await opend.listItem(props.id,Number(price));
  //console.log("listing: "+listingResult);
  if(listingResult=="Success"){
    const openDId= await opend.getOpenDCanisterID();
    const transferResult=await NFTActor.transferOwnership(openDId);
   // console.log("transfer: " + transferResult);
    if(transferResult=="Success"){
      setLoaderHidden(true);
      setButton();
      setPriceInput();
      setOwner("OpenD");
      setStatus(" Listed");
    }
  }
}

async function handleBuy(){
  console.log("buy was trigged");
  setLoaderHidden(false);
  const tokenActor= await Actor.createActor(tokenIdlFactory,{
    agent,
    canisterId: Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"),
  });

  const sellerId=await opend.getOriginalOwner(props.id);
  const itemPrice=await opend.getListedNFTPrice(props.id);

  const result= await tokenActor.transfer(sellerId,itemPrice);
  console.log(result);
  
  if(result =="Success") {
    //transferring ownership

    const transferResult = await opend.completePurchase(
      props.id,
      sellerId,
      CURRENT_USER_ID
    );
    console.log("purchase: " + transferResult);
    setLoaderHidden(true);
    setDisplay(false);

  } else{
    setButton(<Button text={"!! Insufficient Funds !!"} />);
    setLoaderHidden(true);
  }

}








  return (
    <div  style={ {display: shouldDisplay ? "inline" : "none" }} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text">{sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
