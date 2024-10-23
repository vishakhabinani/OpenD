import Text "mo:base/Text";
import Principal "mo:base/Principal";
import NFTActorClass "../NFT/nft";
import Cycles "mo:base/ExperimentalCycles";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import List "mo:base/List";
import Iter "mo:base/Iter";



actor OpenD {

    //Declaring a new data type to store information for the listed NFTs.
    private type Listing = {
        itemOwner:Principal;
        itemPrice:Nat;
    };

    var mapOfNFTs=HashMap.HashMap<Principal,NFTActorClass.NFT>(1,Principal.equal,Principal.hash); //stores canister ids with the canisters
    var mapOfOwners=HashMap.HashMap<Principal,List.List<Principal>>(1,Principal.equal,Principal.hash); //Principal id of user is mapped with a list of principal ids,each corresponding to a unique NFT.
    var mapOfListings=HashMap.HashMap<Principal,Listing>(1,Principal.equal,Principal.hash);

    public shared(msg) func mint(imgData:[Nat8],name:Text):async Principal {
        let owner : Principal = msg.caller;

        Debug.print(debug_show(Cycles.balance()));
        
        Cycles.add(100_500_000_000); //to allot cycles for creation of new canister for an NFT
        let newNFT= await NFTActorClass.NFT(name,owner,imgData); //returns the newly created canister for the new NFT.
        Debug.print(debug_show(Cycles.balance()));

        let newNFTPrincipal= await newNFT.getCanisterId();  //id of newly created canister is returned from the nft.mo using the this feature

        mapOfNFTs.put(newNFTPrincipal,newNFT); //(canisteridofnewNFT,canister class with its own queries and methods)
        addToOwnershipMap(owner,newNFTPrincipal);

        return newNFTPrincipal; //this is returned to the frontend as principal of the NFT(canister id)



    };

    private func addToOwnershipMap(owner: Principal, nftId: Principal) //to add to the mapOfOwners, the newly created NFTs.
    {
        var ownedNFTs : List.List<Principal> = switch (mapOfOwners.get(owner)) //List of principals of NFTs
        {
            case null List.nil<Principal>();
            case (?result) result;

        };

        ownedNFTs := List.push(nftId,ownedNFTs); //pushing the newly minted NFT principal into owners list of NFTs(principals).
        mapOfOwners.put(owner,ownedNFTs);
    };

    public query func getOwnedNFTs(user:Principal) : async [Principal] //returning an array of the owned NFTs ka Principals so the frontend can use it
    {
        var userNFTs : List.List<Principal> = switch (mapOfOwners.get(user)) //List of principals of NFTs owned by the user
        {
            case null List.nil<Principal>();
            case (?result) result;

        };

        return List.toArray(userNFTs); //to convert this List to an Array for frontend convenience.

    };


    public query func getListedNFTs(): async [Principal] {

     let ids = Iter.toArray(mapOfListings.keys()); 
     return ids; // returns an iterable array of the principal ids of the listed NFTs.

    };

    public shared(msg) func listItem(id:Principal,price:Nat) : async Text //the msg.caller will be the owners principal id
    {
       var item : NFTActorClass.NFT = switch(mapOfNFTs.get(id)){
        case null return "NFT does not exist.";
        case (?result) result;
       };

       let owner= await item.getOwner(); //using this query func from NFT actor class to get real owner
       if(Principal.equal(owner,msg.caller)){
        let newListing:Listing={
            itemOwner=owner;
            itemPrice=price;
        };
        mapOfListings.put(id,newListing);
        return "Success";

       } else {
        return "You dont own the NFT.";
       }

    };

    public query func getOpenDCanisterID(): async Principal {
        return Principal.fromActor(OpenD); //returns principal of Canister OpenD (backend canister)
    };

    public query func isListed(id:Principal):async Bool {
        if(mapOfListings.get(id)==null){
            return false;
        } else{
            return true;
        }
    };

    public query func getOriginalOwner(id:Principal):async Principal //this func takes principal id of NFT and returns principal id of the original owner 
    {
        var listing : Listing = switch (mapOfListings.get(id)){
            case null return Principal.fromText("");  //returning an empty principal
            case (?result) result;
        };

        return listing.itemOwner;

    };

    public query func getListedNFTPrice(id:Principal) : async Nat {
       var listing : Listing = switch (mapOfListings.get(id)){
        case null return 0;
        case (?result) result;
       };
       return listing.itemPrice;
    };

    public shared(msg) func completePurchase(id:Principal,ownerId:Principal,newOwnerId:Principal) : async Text {
        var purchasedNFT : NFTActorClass.NFT = switch(mapOfNFTs.get(id)){
            case null return "NFT doesnt exist";
            case (?result) result;
        };

        let transferResult = await purchasedNFT.transferOwnership(newOwnerId);
        if(transferResult== "Success"){
            mapOfListings.delete(id);
            var ownedNFTs : List.List<Principal> = switch (mapOfOwners.get(ownerId)) {
                case null List.nil<Principal>();
                case (?result) result;

            };

            getOwnedNFTs := List.filter(ownedNFTs, func (listItemId:Principal) : Bool {
                return listItemId != id;  //returns all NFTs except for the one that got sold sold
            });

            addToOwnershipMap(newOwnerId,id);
            return "Success";
            } else {
                return "Error";
            }
    };
};
