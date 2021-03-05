import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import Button from "@material-ui/core/Button";
import { Box, Slider } from "@material-ui/core";
import { observer, useLocalObservable } from "mobx-react-lite";
import { makeAutoObservable } from "mobx";
import { log } from "node:console";
import _ from "lodash";

export interface QuakeInfo {
  id: number;
  date: Date;
  lat: number;
  lng: number;
  depth: number;
  m: number;
  ml: number;
}

async function fetchData() {
  const res = await fetch("/week9.txt");
  const txt = await res.text();
  const lines = txt.split("\n").slice(1).filter(Boolean);
  const parsed = lines.map(parseLine);
  console.log(parsed);
  return parsed;
}

function parseLine(str: string): QuakeInfo {
  const splits = str.split(/\s+/).filter(Boolean);
  const [id, date, time, lat, long, depth, m, ml] = splits;
  const [year, month, day] = date.match(/(\d{4})(\d{2})(\d{2})/)!.slice(1);
  const [hour, minute, second, ms] = time
    .match(/(\d{2})(\d{2})(\d{2})\.(\d{3})/)!
    .slice(1);
  return {
    id: Number.parseInt(id),
    date: new Date(+year, +month - 1, +day, +hour, +minute, +second, +ms),
    lat: +lat,
    lng: +long,
    depth: +depth,
    m: +m,
    ml: +ml,
  };
}

class QuakeStore {
  public allQuakes: QuakeInfo[] = [];

  public selectedMin: number = 0;
  public selectedMax: number = 0;

  constructor() {
    makeAutoObservable(this);
  }

  fetchQuakes = async () => {
    const quakes = await fetchData();
    this.allQuakes = quakes.sort((a, b) => a.date.getTime() - b.date.getTime());
    this.selectedMin = this.firstQuake.date.getTime() / 1000;
    this.selectedMax = this.lastQuake.date.getTime() / 1000;
  };

  public get firstQuake(): QuakeInfo {
    return this.allQuakes[0];
  }
  public get lastQuake(): QuakeInfo {
    return this.allQuakes[this.allQuakes.length - 1];
  }

  public setMin = (val: number) => {
    this.selectedMin = val;
  };
  public setMax = (val: number) => {
    this.selectedMax = val;
  };

  public get filtered() {
    return this.allQuakes.filter((q) => {
      const qd = q.date.getTime() / 1000;
      return qd >= this.selectedMin && qd <= this.selectedMax;
    });
  }
}

export const App = observer(function App() {
  const quakeStore = useLocalObservable(() => new QuakeStore());

  useEffect(() => {
    quakeStore.fetchQuakes();
  }, []);

  return (
    <Box display="grid" gridTemplateRows="80% auto" width="100%" height="100%">
      <MyMapComponent allQuakes={quakeStore.filtered} />
      {quakeStore.allQuakes.length > 0 && (
        <Box p={2}>
          <Slider
            onChange={(ev, newValue) => {
              if (typeof newValue === "number") {
                return;
              }
              const [min, max] = newValue;
              quakeStore.setMin(min);
              quakeStore.setMax(max);
            }}
            value={[quakeStore.selectedMin, quakeStore.selectedMax]}
            min={quakeStore.firstQuake.date.getTime() / 1000}
            step={7200}
            max={quakeStore.lastQuake.date.getTime() / 1000}
          ></Slider>
        </Box>
      )}
    </Box>
  );
});

export const MyMapComponent = observer(function MyMapComponent(props: {
  allQuakes: QuakeInfo[];
}) {
  return (
    <Box>
      <MapContainer
        style={{ width: "100%", height: "100%" }}
        center={[64.1466, -21.9426]}
        zoom={8}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {props.allQuakes.map((quake) => (
          <Circle
            key={quake.id}
            color="green"
            center={quake}
            radius={1 * Math.pow(4, quake.m)}
          >
            <Popup>
              <Box display="flex" flexDirection="column">
                <span>
                  Date: {quake.date.toLocaleDateString()} -{" "}
                  {quake.date.toLocaleTimeString()}
                </span>
                <span>Magnitude: {quake.m}</span>
              </Box>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </Box>
  );
});

export default App;
