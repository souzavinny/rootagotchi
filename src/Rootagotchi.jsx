import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import 'nes.css/css/nes.min.css';
import BlockagotchiRanking from './BlockagotchiRanking';
import LoadingScreen from './loading-screen-component';
import CustomAlert from './custom-alert-component';
import shinyMark from './assets/blockagotchis/shiny_mark.png';

import blobSprite from './assets/blockagotchis/blobSprite.png';
import birdSprite from './assets/blockagotchis/Bird.png';
import dogSprite from './assets/blockagotchis/Dog.png';
import catSprite from './assets/blockagotchis/Cat.png';
import duckSprite from './assets/blockagotchis/Duck.png';
import wolfSprite from './assets/blockagotchis/Wolf.png';
import tigerSprite from './assets/blockagotchis/Tiger.png';
import lionSprite from './assets/blockagotchis/Lion.png';

export default function Linkagotchi({ contract, account }) {
  const [blockagotchi, setBlockagotchi] = useState(null);
  const [newBlockagotchiName, setNewBlockagotchiName] = useState('');
  const [loading, setLoading] = useState(true);
  const [gameBalance, setGameBalance] = useState('0.0000000');
  const [animationState, setAnimationState] = useState('idle');
  const [showRanking, setShowRanking] = useState(false);
  const [alert, setAlert] = useState(null);

  const Action = {
    Fly: 0,
    Climb: 1,
    Run: 2,
    Feed: 3,
    Bathe: 4
  };

  useEffect(() => {
    if (contract && account) {
      loadActiveBlockagotchi();
      fetchBalance();
    }
  }, [contract, account]);

  const loadActiveBlockagotchi = async () => {
    setLoading(true);
    try {
      const activeBlockagotchiId = await contract.activeBlockagotchi(account);

      if (activeBlockagotchiId.toNumber() === 0) {
        console.log("No active Blockagotchi found");
        setBlockagotchi(null);
        setLoading(false);
        return null;
      }

      const blockagotchiData = await contract.blockagotchis(activeBlockagotchiId);

      const updatedBlockagotchi = {
        id: activeBlockagotchiId.toNumber(),
        name: ethers.utils.parseBytes32String(blockagotchiData.name),
        stage: blockagotchiData.stage,
        race: blockagotchiData.race,
        experience: blockagotchiData.experience.toNumber(),
        happiness: blockagotchiData.happiness.toNumber(),
        health: blockagotchiData.health.toNumber(),
      };

      console.log("RACA: " + updatedBlockagotchi.race);
      setBlockagotchi(updatedBlockagotchi);
      setLoading(false);
      setAnimationState('idle');
      return updatedBlockagotchi;
    } catch (error) {
      console.error("Failed to load active Blockagotchi:", error);
      setBlockagotchi(null);
      setLoading(false);
      return null;
    }
  };

  const fetchBalance = async () => {
    try {
      let provider;
      if (window.rootstock) {
        provider = new ethers.providers.Web3Provider(window.rootstock);
      } else if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
      } else {
        throw new Error("No Ethereum provider found");
      }

      console.log("Provider:", account);
      const balance = await provider.getBalance(account);
      console.log("Raw Balance:", balance.toString());
      setGameBalance(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };


  const getBlockagotchiSprite = (race) => {
    console.log(race);
    const raceSprites = {
      0: blobSprite,
      1: birdSprite,
      2: dogSprite,
      3: catSprite,
      4: duckSprite,
      5: wolfSprite,
      6: tigerSprite,
      7: lionSprite
    };

    return raceSprites[race] || blobSprite;
  };

  const getStageString = (stage) => {
    const stages = ['Blob', 'Child', 'Teen', 'Adult', 'Old'];
    return stages[stage] || 'Unknown';
  };

  const createBlockagotchi = async () => {
    if (!newBlockagotchiName || newBlockagotchiName.length > 32) {
        setAlert({ message: "Please enter a name (32 characters max) for your Blockagotchi", type: 'error' });
        return;
    }
    setLoading(true);
    try {
        setAlert({ message: "Creating your Blockagotchi... This may take a moment.", type: 'info' });

        const bytes32Name = ethers.utils.formatBytes32String(newBlockagotchiName);
        const tx = await contract.createBlockagotchi(bytes32Name);
        await tx.wait();

        let newBlockagotchi = null;
        let attempts = 0;
        const maxAttempts = 10;

        while (!newBlockagotchi && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            newBlockagotchi = await loadActiveBlockagotchi();

            if (newBlockagotchi && ethers.utils.parseBytes32String(newBlockagotchi.name) === newBlockagotchiName) {
                break;
            }
        }

        if (newBlockagotchi && ethers.utils.parseBytes32String(newBlockagotchi.name) === newBlockagotchiName) {
            setAlert({
                message: `Blockagotchi "${newBlockagotchiName}" created successfully!`,
                type: 'success'
            });
            setNewBlockagotchiName('');
        } else {
            setAlert({ message: "Blockagotchi creation confirmed, but not yet visible. Please check again later.", type: 'warning' });
        }
    } catch (error) {
        console.error("Failed to create Blockagotchi:", error);
        setAlert({ message: "Failed to create Blockagotchi. Please try again.", type: 'error' });
    } finally {
        setLoading(false);
    }
};

  const getRaceString = (race) => {
    const races = [
      'None',  
      'Bird',  
      'Dog',   
      'Cat',   
      'Eagle', 
      'Wolf',  
      'Tiger'  
    ];
    return races[race] || 'Unknown';
  };

  const performAction = async (actionType) => {
    const ActionNames = {
      0: "Fly",
      1: "Climb",
      2: "Run",
      3: "Feed",
      4: "Bathe"
    };

    if (!blockagotchi) {
      setAlert({ message: "No active Blockagotchi to perform action on!", type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const tx = await contract.performAction(blockagotchi.id, actionType);
      await tx.wait();

      const updatedBlockagotchi = await loadActiveBlockagotchi();

      

      if (!updatedBlockagotchi) {
        setAlert({ message: "Failed to load Blockagotchi after action", type: 'error' });
        return;
      }

      if (updatedBlockagotchi.race !== blockagotchi.race) {
        // Blockagotchi evoluiu
        setAlert({
          message: "Congratulations! Your Blockagotchi evolved!",
          type: 'evolution',
          spriteUrl: getBlockagotchiSprite(updatedBlockagotchi.race),
          action: 'evolve',
          isShiny: updatedBlockagotchi.isShiny
        });
      } else {
        // Ação normal
        setAlert({
          message: `Action ${ActionNames[actionType]} performed successfully!`,
          type: 'success',
          spriteUrl: getBlockagotchiSprite(updatedBlockagotchi.race),
          action: actionType,
          isShiny: updatedBlockagotchi.isShiny
        });
      }
    } catch (error) {
      console.error(`Failed to perform action ${ActionNames[actionType]}:`, error);
      setAlert({ message: `Failed to perform action ${ActionNames[actionType]}. Please try again.`, type: 'error' });
    }
    setLoading(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="linkagotchi-wrapper">
      <h1 className="linkagotchi-main-title">Rootagotchi</h1>
      {showRanking ? (
        <BlockagotchiRanking contract={contract} onClose={() => setShowRanking(false)} />
      ) : (
        <div className="nes-container with-title is-centered">
          <p className="title">Blockagotchi</p>
          <div className="nes-container is-rounded">
            <div className="linkagotchi-menu">
              <button className="nes-btn is-primary" onClick={() => setShowRanking(true)}>Ranking</button>
              <span>Game balance: {parseFloat(gameBalance).toFixed(5)} TRBTC</span>
              <span className="wallet-address">{account.slice(0, 6)}...{account.slice(-4)}</span>
            </div>

            {blockagotchi ? (
              <>
                <h2 className="blockagotchi-name">
                  {blockagotchi.name}
                  {blockagotchi.isShiny && <img src={shinyMark} alt="Shiny" className="shiny-mark" />}
                </h2>
                <div className="blockagotchi-sprite-container">
                  <div className={`blockagotchi-sprite ${blockagotchi.isShiny ? 'shiny' : ''} ${animationState}`}
                    style={{
                      backgroundImage: `url(${getBlockagotchiSprite(blockagotchi.race)})`,
                      animation: !blockagotchi.isShiny ? 'custom-sprite-idle 1s steps(2) infinite' : 'custom-sprite-shiny 2s linear infinite'
                    }}
                  />

                </div>
                <div className="linkagotchi-info">
                  <p>ID: {blockagotchi.id}</p>
                  <p>Stage: {getStageString(blockagotchi.stage)}</p>
                  <p>Race: {getRaceString(blockagotchi.race)}</p>
                  <p>Experience: {blockagotchi.experience}</p>
                  <p>Happiness: {blockagotchi.happiness}</p>
                  <p>Health: {blockagotchi.health}</p>
                </div>
                <div className="linkagotchi-actions">
                  <button className="nes-btn" onClick={() => performAction(Action.Feed)}>Feed</button>
                    <button className="nes-btn" onClick={() => performAction(Action.Bathe)}>Bathe</button>
                    <button className="nes-btn" onClick={() => performAction(Action.Fly)}>Fly</button>
                    <button className="nes-btn" onClick={() => performAction(Action.Run)}>Run</button>
                    <button className="nes-btn" onClick={() => performAction(Action.Climb)}>Climb</button>
                </div>
              </>
            ) : (
              <div className="linkagotchi-create">
                <h2>Create a blockagotchi</h2>
                <div className="nes-field">
                  <label htmlFor="name_field">Name</label>
                  <input
                    type="text"
                    id="name_field"
                    className="nes-input"
                    placeholder="Insert a name"
                    value={newBlockagotchiName}
                    onChange={(e) => setNewBlockagotchiName(e.target.value)}
                  />
                </div>
                <button className="nes-btn is-primary" onClick={createBlockagotchi}>Create</button>
              </div>
            )}
            {alert && (
              <CustomAlert
                message={alert.message}
                type={alert.type}
                spriteUrl={alert.spriteUrl}
                action={alert.action}
                isShiny={blockagotchi?.isShiny}
                onClose={() => setAlert(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}