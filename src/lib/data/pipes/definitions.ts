import type { PipeDefinition, Port } from "./types";

const straightPorts: Port[] = [
  { id: "in_0", direction: "input", resourceType: "solid" },
  { id: "out_0", direction: "output", resourceType: "solid" },
];

const threewayPorts: Port[] = [
  { id: "in_0", direction: "input", resourceType: "solid" },
  { id: "out_0", direction: "output", resourceType: "solid" },
  { id: "out_1", direction: "output", resourceType: "solid" },
];

const fourwayPorts: Port[] = [
  { id: "in_0", direction: "input", resourceType: "solid" },
  { id: "out_0", direction: "output", resourceType: "solid" },
  { id: "out_1", direction: "output", resourceType: "solid" },
  { id: "out_2", direction: "output", resourceType: "solid" },
];

export const REPOSITORY_PIPES_BASE: PipeDefinition[] = [
  {
    id: "basic_pipe_short",
    name: "Basic Pipe (Short)",
    geometry: "straight",
    length: "short",
    ports: straightPorts,
  },
  {
    id: "basic_pipe_long",
    name: "Basic Pipe (Long)",
    geometry: "straight",
    length: "long",
    ports: straightPorts,
  },
  {
    id: "basic_pipe_elbow_long",
    name: "Basic Pipe (Elbow Long)",
    geometry: "elbow",
    length: "long",
    ports: straightPorts,
  },
  {
    id: "basic_pipe_elbow_short",
    name: "Basic Pipe (Elbow Short)",
    geometry: "elbow",
    length: "short",
    ports: straightPorts,
  },
  {
    id: "threeway_pipe_short",
    name: "Threeway Pipe (Short)",
    geometry: "threeway",
    length: "short",
    ports: threewayPorts,
  },
  {
    id: "threeway_pipe_long",
    name: "Threeway Pipe (Long)",
    geometry: "threeway",
    length: "long",
    ports: threewayPorts,
  },
  {
    id: "fourway_pipe_short",
    name: "Fourway Pipe (Short)",
    geometry: "fourway",
    length: "short",
    ports: fourwayPorts,
  },
];
