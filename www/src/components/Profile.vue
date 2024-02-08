<script>
import cache from "../cache";
export default {
  data() {
    return {
      user: {},
      menu_visible: false,
      common: this.$store.state["common"],
      themes: [
        { name: "Темная", val: "dark" },
        { name: "Темная объемная", val: "dark_3d" },
        { name: "Светлая", val: "light" },
        { name: "Я блондинка!", val: "pink" },
      ],
      theme: "dark",
      langs: [{ name: "Русский", val: "ru" }],
      lang: { name: "Русский", val: "ru" },
      lock_main_menu: false,
      //instead of user.avatar for new year
      is_new_year: false,
    };
  },
  mounted() {
    console.log("Cached profile:", cache.getObject('profile'));
    for (let i = 0; i < this.themes.length; i++) {
      if (cache.getString("theme") === this.themes[i].val) this.theme = this.themes[i];
    }
    this.lock_main_menu = cache.getObject("lock_main_menu");
//document.addEventListener("click", this.close_menu);

    this.update_user()

    cache.set_profile_listener(this.update_user)

    const admin_role_uuid = '556972a6-0370-4f00-aca2-73a477e48999'
    this.$store.state.common.is_admin = false
    for(let i in this.user.roles){
      if(this.user.roles[i].uuid == admin_role_uuid){
        this.$store.state.common.is_admin = true
        break
      }
    }
    console.log('isadmin>>>>>>>>>>', this.$store.state.common.is_admin)
  },
  updated() {
    //console.log('uuuuu')
  },

  methods: {
    update_user(){
      try {
        this.user = cache.getObject("profile");
      } catch (err) {}
    },
    logout() {
      cache.setString("user_token", "");
      cache.setObject("profile", {});
      this.$router.push('/' + this.$store.state['common'].workspace + "/login");
    },
    close_menu(e) {
    //  console.log('ccc', e);
    //  if(e.target.localName == "img") return
    //  for (let i in e.path) {
        //if (e.path[i].className == "profile") return;
    //    localName
    //  }
      this.menu_visible = false;
    },
    set_theme(theme) {
      this.theme = theme;
      cache.setString("theme", theme.val)
      let htmlElement = document.documentElement;
      htmlElement.setAttribute("theme", theme.val);
    },
    set_lang(lang) {},
    update_lock_main_menu(value) {
      cache.setObject("lock_main_menu", value)
    },

    get_avatar()
    {
      return this.user.avatar ? this.user.avatar : 'https://oboz.myjetbrains.com/hub/api/rest/avatar/7755ec62-dfa1-4c3c-a3a9-ac6748d607c1?dpr=1.25&size=20'
    },
    toggle_menu()
    {
      console.log('tm')
      this.menu_visible = !this.menu_visible
    }
    
  },
};
</script>

<template>
  <div class="profile" v-if="common.is_in_workspace" v-click-outside="close_menu">
    <div class="profile-top">
      <img @click="toggle_menu()" :src="get_avatar()"  />
      <div class="profile-username">{{ user.name }}</div>
      <div class="issue-top-button">
        <a
            class="bx new-issue-btn"
            title="Создать новую задачу"
            :href="'/' + $store.state['common'].workspace + '/issue?t=' + new Date().getTime()"
            tag="i"
        >
        
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
          width="586.000000pt" height="637.000000pt" viewBox="0 0 586.000000 637.000000"
          preserveAspectRatio="xMidYMid meet">

          <g transform="translate(0.000000,637.000000) scale(0.100000,-0.100000)"
          fill="#000000" stroke="none">
          <path d="M1355 6343 c-113 -59 -199 -157 -237 -272 -21 -62 -22 -88 -26 -443
          -2 -252 0 -395 8 -431 35 -171 165 -310 337 -362 55 -17 198 -19 262 -4 158
          36 304 180 347 344 17 61 20 752 4 835 -6 30 -21 78 -35 108 -32 70 -140 181
          -215 221 l-58 31 -168 0 c-162 -1 -171 -2 -219 -27z m293 -294 c29 -15 54 -37
          73 -67 l29 -46 0 -320 c-1 -336 -5 -372 -47 -418 -26 -29 -87 -58 -123 -58
          -44 0 -104 34 -137 77 l-28 36 -3 346 c-2 343 -2 346 21 386 25 45 92 85 141
          85 16 0 50 -10 74 -21z"/>
          <path d="M4241 6343 c-71 -35 -152 -111 -195 -181 -64 -106 -67 -134 -64 -590
          l3 -407 32 -68 c38 -80 131 -182 201 -220 85 -46 154 -60 272 -55 92 4 115 8
          171 35 74 34 174 122 217 191 66 104 67 116 67 547 -1 373 -2 393 -23 461 -27
          90 -94 181 -176 241 -94 70 -108 73 -290 73 -154 0 -163 -1 -215 -27z m290
          -293 c21 -11 53 -39 69 -62 l30 -41 0 -337 c0 -332 0 -337 -23 -380 -26 -50
          -90 -89 -146 -90 -50 0 -109 38 -139 90 l-27 45 0 336 0 335 27 41 c29 44 95
          83 141 83 15 0 46 -9 68 -20z"/>
          <path d="M805 6150 c-101 -20 -324 -118 -355 -155 -7 -8 -19 -15 -27 -15 -22
          0 -276 -258 -324 -330 -24 -36 -56 -91 -71 -123 l-28 -57 0 -2463 c1 -2579 0
          -2503 43 -2584 57 -106 193 -260 274 -309 80 -49 150 -82 202 -98 50 -15 274
          -16 2429 -16 l2374 0 66 27 c89 35 162 86 264 182 93 88 163 178 190 243 16
          40 17 195 17 2557 l1 2513 -25 50 c-46 92 -100 163 -207 274 -121 125 -189
          178 -309 241 -67 35 -92 43 -136 43 l-53 0 0 -194 c0 -193 0 -195 23 -202 30
          -9 124 -69 167 -107 92 -80 185 -240 220 -381 20 -78 20 -114 20 -1991 0
          -1876 0 -1913 -20 -1990 -55 -216 -183 -379 -371 -472 -138 -68 29 -63 -2366
          -61 l-2168 3 -45 21 c-25 12 -62 35 -84 53 -42 34 -76 40 -96 16 -18 -21 -8
          -128 18 -196 29 -73 116 -176 184 -217 l55 -32 2277 0 c1458 0 2284 3 2295 10
          10 5 21 6 25 3 8 -8 -55 -44 -114 -65 -130 -45 -13 -43 -2215 -43 -1955 0
          -2084 1 -2149 18 -108 28 -231 92 -296 156 -66 66 -142 203 -134 242 4 17 3
          20 -4 10 -7 -10 -14 6 -26 57 -14 64 -16 281 -16 2230 0 2124 0 2160 20 2238
          38 152 142 322 237 391 72 52 199 111 273 126 l65 13 3 197 2 197 -32 -1 c-18
          -1 -51 -5 -73 -9z"/>
          <path d="M2240 5960 l0 -180 778 2 777 3 3 178 2 177 -780 0 -780 0 0 -180z"/>
          <path d="M822 4477 l-32 -33 0 -406 0 -406 35 -31 36 -31 514 0 514 0 -44 -82
          c-55 -105 -105 -229 -105 -262 l0 -26 -448 0 -448 0 -27 -28 -27 -28 0 -400 0
          -400 38 -37 38 -37 407 0 406 0 11 -42 c22 -86 53 -184 75 -239 l22 -56 -465
          -6 -466 -7 -33 -32 -33 -32 0 -397 0 -396 45 -42 45 -41 590 0 591 0 49 46 50
          47 0 100 0 101 -42 43 -42 43 -468 0 -468 0 0 95 0 95 431 0 432 0 119 -124
          c236 -247 435 -377 724 -471 188 -61 354 -85 599 -85 285 0 466 30 683 111
          190 72 349 167 502 301 228 200 397 428 495 666 86 211 123 389 132 637 16
          470 -117 872 -402 1214 -377 452 -893 681 -1479 658 -415 -17 -756 -144 -1064
          -396 -51 -42 -107 -86 -124 -98 l-31 -23 -508 0 -509 0 0 100 0 100 468 0 468
          0 42 43 42 43 0 97 0 97 -41 45 -42 45 -611 0 -612 0 -32 -33z m2873 -426
          c286 -62 565 -210 756 -400 117 -116 196 -227 267 -373 98 -199 144 -364 158
          -570 15 -214 -66 -525 -197 -753 -128 -224 -354 -430 -606 -551 -427 -205
          -844 -204 -1258 4 -189 94 -341 211 -446 343 -188 236 -306 513 -339 795 -32
          277 86 671 282 937 231 313 602 532 1003 591 66 10 293 -4 380 -23z m-2045
          -1306 l0 -95 -255 0 -255 0 0 95 0 95 255 0 255 0 0 -95z"/>
          <path d="M3360 3658 c-87 -45 -84 -31 -90 -441 l-5 -362 -350 -5 c-377 -5
          -380 -6 -432 -62 -32 -34 -43 -71 -43 -141 0 -75 28 -131 80 -161 33 -20 55
          -21 390 -26 l355 -5 5 -357 c5 -342 6 -358 26 -385 41 -55 80 -73 161 -73 86
          0 120 14 160 67 l28 37 0 353 c0 304 2 355 15 363 9 5 100 7 220 4 113 -3 270
          -2 350 3 128 8 149 12 176 32 43 31 56 63 61 146 4 60 1 76 -19 115 -46 85
          -44 85 -445 88 l-352 3 -3 364 -3 363 -31 38 c-36 45 -79 62 -154 63 -39 1
          -69 -6 -100 -21z"/>
          </g>
          </svg>
        </a>
      </div>


    </div>

    <div v-if="menu_visible" id="profile-menu" class="panel">
      <SelectInput
        label="Тема"
        :values="themes"
        :value="theme"
        :reduce="(obj) => obj.val"
        @update_parent_from_input="set_theme"
        :close_on_select="false"
        :parameters="{ clearable: false }"
      >
      </SelectInput>
      <SelectInput
        label="Язык"
        :values="langs"
        :value="lang"
        :reduce="(obj) => obj.val"
        @update_parent_from_input="set_lang"
        :parameters="{ clearable: false }"
      >
      </SelectInput>
      <BooleanInput
        label="Главное меню по логотипу"
        :value="lock_main_menu"
        @update_parent_from_input="update_lock_main_menu"
        style="margin-bottom: 10px"
      ></BooleanInput>
      <div id="profile-menu-exit" @click="logout()">
        <div>
          <i class="bx bxs-door-open"></i>
          <span>Выход</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../css/global.scss";

.profile {
  position: absolute;
  right: 0;
  top: 0;
  padding: 10px 25px;
  z-index: 1;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  color: white;
  width: auto;
}

.profile-username {
  padding: 5px;
  margin: 0 5px;
}

.new-issue-btn {
  display: flex !important;
  align-content: center;
  justify-content: center;
  flex-wrap: wrap;
  position: relative;
  width: 32px !important;
  height: 32px !important;
  font-size: 30px;
  cursor: pointer;
  text-decoration: none;
  color: var(--on-button-icon-color);
}
.new-issue-btn g{
  fill: var(--on-button-icon-color);
}

.new-issue-btn svg{
  height: fit-content;
}



.new-issue-btn{
  padding: 4px;
}

.profile img {
  height: $input-height;
  width: $input-height;

  //new year
  //margin-top: -5px;
  //margin-right: -20px;
  //height: 50px;
  //width: 50px;

  object-fit: cover;
  border-radius: var(--border-radius);
  float: right;
 
  cursor: pointer;
  border-style: outset;
  border-width: 1px;
}

.profile-top {
  display: contents;
}

.profile-top div {
  float: right;
  font-weight: 600;
  font-size: 14px;
}

#profile-menu {
  position: absolute;
  right: 0;
  width: 250px;

  top: calc($top-menu-height + 2px);
  margin: 0;
  padding: 20px;
  background: var(--table-row-color);

  display: flex;
  flex-direction: column;
}

#profile-menu > *:not(:last-child) {
  margin-bottom: 10px;
}

#profile-menu-exit {
  width: 100%;
  margin-bottom: 0 !important;
}

#profile-menu-exit div {
  border-radius: var(--border-radius);
  border-color: var(--border-color);
  border-style: outset;
  text-align: center;
  cursor: pointer;
  height: $input-height;
  padding: 5px;
  border-width: var(--border-width);
  display: flex;
  align-items: center;
  background-color: var(--button-color);
}

#profile-menu-exit i {
  font-size: 20px;
}

</style>
