"use client";
import WebpConverter from "@/components/tools/WebpConverter/WebpConverter";
import PngConverter from "@/components/tools/PngConverter/PngConverter";
import PListConverter from "@/components/tools/PListConverter/PListConverter";
import DragonBoneTester from "@/components/tools/DragonBone/DragonBoneTester";
import IFrameSimulator from "@/components/tools/GameIFrame/GameIFrame";
import MockupLayout from "@/components/tools/MockupLayout/MockupLayout"

import Image from "next/image";
import navbar from "./navbar.module.css";
import container from "./component.module.css";
import {useState} from "react";

export default function Tools() {
    const toolList = [
        "Convert to Webp",
        "Convert to PNG",
        "Convert to PList",
        "Bitmap Font Tester",
        "Rich Text Tester",
        "Dragonbone Tester",
        "Translation Generator",
        "IFrame Simulator",
        "Mockup Layout"
    ];

    const toolsByCategory: Record<string, string[]> = {
        Converters: ["Convert to Webp", "Convert to PNG", "Convert to PList"],
        Testers: ["Bitmap Font Tester", "RichText Tester", "Dragonbone Tester"],
        Generators: ["Translation Generator"],
        Simulator: ["IFrame Simulator"],
        Layout: ["Mockup Layout"]
    };

    const toolCategory = ["Converters", "Testers", "Generators", "Simulator", "Layout"];

    const toolComponents: Record<string, React.ReactNode> = {
        "Convert to Webp": <WebpConverter/>,
        "Convert to PNG": <PngConverter/>,
        "Convert to PList": <PListConverter/>,
        "Dragonbone Tester": <DragonBoneTester/>,
        "IFrame Simulator": <IFrameSimulator/>,
        "Mockup Layout": <MockupLayout/>
    };

    const [selectedTool, setSelectedTool] = useState(toolList[0]);

    return (
        <div className={container.layout}>
            {/* NAVBAR */}
            <div className={navbar.navbar}>
                <div className={navbar.navbarToolTitle}>
                    <label>Modern Dev Tool</label>
                </div>
                <div className={navbar.navbarToolContainer}>
                    {toolCategory.map((category) => (
                        <div key={category} className={navbar.navbarToolDropDownContainer}>
                            <div className={navbar.navbarToolDropDown}>
                                <label>
                                    {category}
                                    <i className="fa-solid fa-angle-down"></i>
                                </label>
                            </div>

                            <div className={navbar.navbarToolDropContainer}>
                                {toolsByCategory[category]?.map((tool) => (
                                    <div
                                        key={tool}
                                        className={navbar.navbarToolItem}
                                        onClick={() => setSelectedTool(tool)}
                                    >
                                        {tool}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* CONTENT */}
            <div className={container.centerContainer}>
                {toolComponents[selectedTool]}
            </div>
        </div>
    );
}
