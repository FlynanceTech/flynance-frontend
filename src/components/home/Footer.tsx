import Image from "next/image";
import React from "react";
import instagram from "../../../assets/icons/instagram-fill-icon.png"
import tiktop from "../../../assets/icons/tiktok-icon.png"
import youtube from "../../../assets/icons/youtube-fill-icon.png"

const Footer = () => {
  return (
    <footer
      id="about"
      className="flex flex-wrap items-start mt-16 max-w-full border-t border-neutral-300 w-full md:w-[1280px] max-md:mt-10 pt-8 px-8 xl:px-0"
    >
      <div className="flex flex-col items-center  w-full md:grow md:shrink text-base text-gray-700 md:min-w-60 md:w-[230px] mb-8 md:mb-0">
        <Image
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/a910078cae17c571538460f2c5bc9bc207aa2474?placeholderIfAbsent=true&apiKey=30d4c2b32552471b89a9a20881bec729"
          alt="Flynance Logo"
          width={216}
          height={124}
          className="object-contain max-w-full aspect-[1.74] w-[216px]"
        />
       
        <div className="flex gap-8 items-center ">
            <a href="https://www.instagram.com/flynance.app/"  target="_blank" aria-label="Facebook">
              <Image
                src={instagram}
                alt="Instagram"
                className="object-contain shrink-0 self-stretch my-auto w-6 aspect-square"
                width={24}
                height={24}
              />
            </a>
            <a href="https://www.tiktok.com/@flynanceapp" target="_blank" aria-label="Twitter">
              <Image
                src={tiktop}
                alt="tiktop"
                className="object-contain shrink-0 self-stretch my-auto w-6 aspect-square"
                width={24}
                height={24}
              />
            </a>
            <a href="https://www.youtube.com/@Flynanceapp" aria-label="Instagram" target="_blank">
              <Image
                src={youtube}
                alt="youtube"
                className="object-contain shrink-0 self-stretch my-auto w-6 aspect-square"
                width={24}
                height={24}
              />
            </a>
          </div>
      </div>

      <div className="flex flex-row w-full md:grow md:shrink gap-10 items-start md:min-w-60 md:w-[612px] mb-8">
        <nav className="flex  flex-col grow shrink text-sm leading-none text-gray-700 whitespace-nowrap w-[86px]">
          <h3 className="self-start text-xl font-medium leading-none text-center">
            Navegação
          </h3>
          <a href="#" className="mt-4">
            Inicio
          </a>
          <a href="#" className="self-start mt-4 text-center">
            Funcionalidades
          </a>
          <a href="#" className="mt-4">
            Planos
          </a>
          <a href="#" className="mt-4">
            Faq
          </a>
        </nav>

        <nav className="flex  flex-col grow shrink text-sm leading-none text-gray-700 w-[129px]">
          <h3 className="text-xl font-medium leading-none">Recursos</h3>
          <a href="#" className="mt-4">
            Termos de Uso
          </a>
          <a href="#" className="self-start mt-4">
            Política de Privacidade
          </a>
        </nav>
      </div>

      <div className=" w-full  pt-6 mt-6 md:mt-0 text-sm leading-none text-center text-gray-700 border-t border-stone-300 mt-8">
        © 2025 Flynance. Todos os direitos reservados.
      </div>
    </footer>
  );
};

export default Footer;
