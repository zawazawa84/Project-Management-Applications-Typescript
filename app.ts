//Drag $ Drop
interface Draggable {
    dragStartHandler(event: DragEvent): void; 
    dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
    dragOverHandler(event: DragEvent): void;
    dropHandler(event: DragEvent): void;
    dragLeaveHandler(event: DragEvent): void;
}

//Proeject Type
enum ProjectStatus {
    Active, Finished
}
class Project {
    constructor(
        public id: string, 
        public title: string,
        public description : string, 
        public manday: number, 
        public status: ProjectStatus
    ){}
}

//Project State Management
type Listener<T> = (item: T[]) => void;

class State<T> {
    protected listeners: Listener<T>[] = [];

    addListener(listenerFn: Listener<T>){
        this.listeners.push(listenerFn);
    }
}
class ProjectState extends State<Project>{

    private projects: Project[] = [];
    private static instance: ProjectState;

    private constructor() {
        super();
    }

    static getInstance() {
        if(this.instance){ 
            return this.instance;
        }
        this.instance = new ProjectState();
        return this.instance;
    }

    addProjects(title: string, description: string, manday: number){
        const newProject = new Project(
            Math.random().toString(),
            title,
            description,
            manday,
            ProjectStatus.Active
        )
        this.projects.push(newProject);
        for (const listenerFn of this.listeners) {
            listenerFn(this.projects.slice());
        }
    }
}

const projectState = ProjectState.getInstance();

// Validation
interface Validatable {
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

function validate(validatableInput: Validatable){
    let isValid = true;
    if(validatableInput.required){
        isValid = isValid && validatableInput.value.toString().trim().length !== 0;
    }
    if(
        validatableInput.minLength != null && 
        typeof validatableInput.value === "string"
    ) {
        isValid = isValid && validatableInput.value.length >= validatableInput.minLength;
    }
    if(
        validatableInput.maxLength != null && 
        typeof validatableInput.value === "string"
    ) {
        isValid = isValid && validatableInput.value.length <= validatableInput.maxLength;
    }
    if(
        validatableInput.min != null && 
        typeof validatableInput.value === "number"
    ) {
        isValid = isValid && validatableInput.value >= validatableInput.min;
    }
    if(
        validatableInput.max != null && 
        typeof validatableInput.value === "number"
    ) {
        isValid = isValid && validatableInput.value <= validatableInput.max;
    }
    return isValid;
}

// autobind decorator
function autobind(
    target:any, 
    methodName:string, 
    descriptor:PropertyDescriptor
    ){
        const originalMethod = descriptor.value;
        const adjDescriptor: PropertyDescriptor = {
            configurable: true,
            get(){
                const boundFn = originalMethod.bind(this);
                return boundFn
            }
        }
        return adjDescriptor;
    }

// Component Class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;

    constructor(
        templateId: string,
        hostElementId: string,
        insrtAtStart: boolean, 
        newElementId?: string
    ){
        this.templateElement = document.getElementById(
            templateId
        )! as HTMLTemplateElement;
        this.hostElement = document.getElementById(hostElementId)! as T;

        const importedNode = document.importNode(
            this.templateElement.content, 
            true
        );
        this.element = importedNode.firstElementChild as U;
        if(newElementId){
            this.element.id = newElementId;
        }

        this.attach(insrtAtStart);
    }

    abstract configure(): void;
    abstract renderContent(): void;

    private attach(insertAtBeginning: boolean){
        this.hostElement.insertAdjacentElement(
            insertAtBeginning ? "afterbegin": "beforeend", 
            this.element
            )
    }
}

//ProjectItem Class
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable{
    private project: Project;

    get manday() {
        if (this.project.manday < 20) {
            return this.project.manday.toString() + "人日";
        } else {
            return (this.project.manday / 20).toString() + "人月";
        }
    }
    
    constructor(hostId: string, project: Project){
    super("single-project", hostId, false, project.id);
    this.project = project;
    
        this.configure();
        this.renderContent();
    }

    @autobind
    dragStartHandler(event: DragEvent): void {
        console.log(event);
    }

    dragEndHandler(_event: DragEvent): void {
        console.log("Drag終了");
    }

    configure(): void{
        this.element.addEventListener("dragstart", this.dragStartHandler);
        this.element.addEventListener("dragend", this.dragEndHandler);
    }

    renderContent(): void {
        this.element.querySelector("h2")!.textContent = this.project.title;
        this.element.querySelector("h3")!.textContent = this.manday;
        this.element.querySelector("p")!.textContent = this.project.description;
    }

}

// ProjectList Class
class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget{
    assingnedProjects: Project[];

    constructor(private type: "active" | "finished"){
        super("project-list", "app", false ,`${type}-projects`);
        this.assingnedProjects = [];

        this.configure();
        this.renderContent();
    }

    @autobind
    dragOverHandler(event: DragEvent): void {
        const listEl = this.element.querySelector("ul")!;
        listEl.classList.add("droppable");
    }

    dropHandler(_event: DragEvent): void {
        
    }

    @autobind
    dragLeaveHandler(_event: DragEvent): void {
        const listEl = this.element.querySelector("ul")!;
        listEl.classList.remove("droppable");
    }

    configure(): void {
        this.element.addEventListener("dragover", this.dragOverHandler)
        this.element.addEventListener("drop", this.dropHandler)
        this.element.addEventListener("dragleave", this.dragLeaveHandler)

        projectState.addListener((projects: Project[]) => {
            const relevantProjects = projects.filter(prj => {
                if(this.type === "active"){
                    return prj.status === ProjectStatus.Active;
                }
                return prj.status === ProjectStatus.Finished;
            })
            this.assingnedProjects = relevantProjects;
            this.renderProjects();
        })
    }

    renderContent(){
        const listId = `${this.type}-projects-list`;
        this.element.querySelector("ul")!.id = listId;
        this.element.querySelector("h2")!.textContent =
            this.type === "active" ? "実行中プロジェクト" : "完了プロジェクト";
    }


    private renderProjects(){
        const listEl = document.getElementById(
            `${this.type}-projects-list`
        )! as HTMLUListElement;
        listEl.innerHTML = "";
        for (const prjItem of this.assingnedProjects) {
            new ProjectItem(listEl.id, prjItem)
        }
    }


}

// ProjectInput class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement>{
    titleInputElement:HTMLFormElement;
    descriptionInputElement:HTMLFormElement;
    mandayInputElement:HTMLFormElement;

    constructor(){
        super("project-input", "app", true, "user-input");

        this.titleInputElement = this.element.querySelector(
            "#title"
        ) as HTMLFormElement;
        this.descriptionInputElement = this.element.querySelector(
            "#description"
        ) as HTMLFormElement;
        this.mandayInputElement = this.element.querySelector(
            "#manday"
        ) as HTMLFormElement;

        this.configure();
    }

    configure(){
        this.element.addEventListener("submit", this.submitHandler)
    }

    renderContent(): void {
        
    }

    private gatherUserInput(): [string, string, number] | void {
        const enteredTitle = this.titleInputElement.value;
        const enteredDescription = this.descriptionInputElement.value;
        const enteredManday = this.mandayInputElement.value;

        const titleValidatable: Validatable = {
            value: enteredTitle,
            required: true
        };

        const descriptionValidatable: Validatable = {
            value: enteredDescription,
            required: true,
            minLength: 5
        };

        const mandayValidatable: Validatable = {
            value: enteredManday,
            required: true,
            min: 1,
            max:100
        };

        if(
            !validate(titleValidatable) ||
            !validate(descriptionValidatable) ||
            !validate(mandayValidatable)
        ){
            alert("入力値が正しくありません。再度お試しください。")
            return;
        } else {
            return [enteredTitle, enteredDescription, enteredManday]
        }
    }

    private clearInputs(){
        this.titleInputElement.value = "";
        this.descriptionInputElement.value = "";
        this.mandayInputElement.value = "";
    }

    @autobind
    private submitHandler(event:Event){
        event.preventDefault();
        const userInput = this.gatherUserInput();
        if(Array.isArray(userInput)){
            const [title, desc, manday] = userInput;
            projectState.addProjects(title, desc, manday);
            this.clearInputs();
        }
    }
}

const prjInput = new ProjectInput();
const activePrjList = new ProjectList("active");
const finishedPrjList = new ProjectList("finished");
